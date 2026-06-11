import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PmPlan } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { format, parseISO, isPast, isWithinInterval, addDays, addMonths, addWeeks } from 'date-fns';
import { CalendarDaysIcon, ExclamationTriangleIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function PMSchedulePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [completingPlan, setCompletingPlan] = useState<PmPlan | null>(null);
  const [pmNotes, setPmNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due-soon' | 'upcoming'>('all');

  const { data: plans = [], isLoading } = useQuery<PmPlan[]>({
    queryKey: ['pm_plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pm_plans').select('*, asset:assets(name,asset_code), assignee:profiles(full_name)').eq('is_active', true).order('next_due_date');
      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  const getStatus = (plan: PmPlan) => {
    try {
      const due = parseISO(plan.next_due_date);
      if (isPast(due)) return 'overdue';
      if (isWithinInterval(due, { start: new Date(), end: addDays(new Date(), 7) })) return 'due-soon';
      return 'upcoming';
    } catch { return 'upcoming'; }
  };

  const calcNextDue = (freq: string, fromDate: string): string => {
    const d = new Date(fromDate);
    const next = freq === 'Daily' ? addDays(d, 1)
      : freq === 'Weekly' ? addWeeks(d, 1)
      : freq === 'Monthly' ? addMonths(d, 1)
      : freq === 'Quarterly' ? addMonths(d, 3)
      : freq === 'Semi-Annual' ? addMonths(d, 6)
      : addMonths(d, 12);
    return next.toISOString().split('T')[0];
  };

  const completePM = useMutation({
    mutationFn: async () => {
      if (!completingPlan) return;
      const today = new Date().toISOString().split('T')[0];
      const nextDue = calcNextDue(completingPlan.frequency, today);
      // Write pm_record
      await supabase.from('pm_records').insert({
        plan_id: completingPlan.id, performed_by: user?.id,
        performed_date: today, notes: pmNotes || null, checklist_results: {}
      });
      // Update pm_plan
      const { error } = await supabase.from('pm_plans').update({ last_performed_date: today, next_due_date: nextDue, updated_at: new Date().toISOString() }).eq('id', completingPlan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pm_plans'] });
      toast.success(`บันทึก PM เสร็จสิ้น — กำหนดครั้งต่อไป: ${completingPlan ? calcNextDue(completingPlan.frequency, new Date().toISOString().split('T')[0]) : ''}`);
      setCompletingPlan(null); setPmNotes('');
    },
    onError: (e: any) => toast.error(e.message)
  });

  const canAct = user?.role !== 'requester';

  const statusBadge = (s: string) => {
    if (s === 'overdue') return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">เกินกำหนด</span>;
    if (s === 'due-soon') return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">ใกล้ครบกำหนด</span>;
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ปกติ</span>;
  };

  if (isLoading) return <div className="p-8 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" /></div>;

  const overdue = plans.filter((p: PmPlan) => getStatus(p) === 'overdue');
  const dueSoon = plans.filter((p: PmPlan) => getStatus(p) === 'due-soon');
  const displayed = filterStatus === 'all' ? plans : plans.filter((p: PmPlan) => getStatus(p) === filterStatus);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตารางบำรุงรักษาเชิงป้องกัน</h1>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <Link to="/pm/schedule/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <PlusIcon className="h-4 w-4" /> เพิ่มแผน PM
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setFilterStatus(filterStatus === 'overdue' ? 'all' : 'overdue')} className={`rounded-xl p-4 border text-left transition-all ${filterStatus === 'overdue' ? 'ring-2 ring-red-500' : ''} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`}>
          <div className="flex items-center gap-2"><ExclamationTriangleIcon className="h-5 w-5 text-red-600" /><span className="font-semibold text-red-700 dark:text-red-400">เกินกำหนด</span></div>
          <p className="text-3xl font-bold text-red-600 mt-1">{overdue.length}</p>
        </button>
        <button onClick={() => setFilterStatus(filterStatus === 'due-soon' ? 'all' : 'due-soon')} className={`rounded-xl p-4 border text-left transition-all ${filterStatus === 'due-soon' ? 'ring-2 ring-yellow-500' : ''} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800`}>
          <div className="flex items-center gap-2"><CalendarDaysIcon className="h-5 w-5 text-yellow-600" /><span className="font-semibold text-yellow-700 dark:text-yellow-400">ใกล้ครบกำหนด (7 วัน)</span></div>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{dueSoon.length}</p>
        </button>
        <button onClick={() => setFilterStatus('all')} className={`rounded-xl p-4 border text-left transition-all ${filterStatus === 'all' ? 'ring-2 ring-green-500' : ''} bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`}>
          <div className="flex items-center gap-2"><CheckCircleIcon className="h-5 w-5 text-green-600" /><span className="font-semibold text-green-700 dark:text-green-400">แผนทั้งหมด</span></div>
          <p className="text-3xl font-bold text-green-600 mt-1">{plans.length}</p>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['เลขแผน','ชื่อแผน','เครื่องจักร','ความถี่','ครั้งล่าสุด','ครั้งถัดไป','ผู้รับผิดชอบ','สถานะ',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayed.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>}
              {displayed.map((plan: PmPlan) => {
                const st = getStatus(plan);
                return (
                  <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{plan.plan_number}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[160px] truncate" title={plan.title}>{plan.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{(plan.asset as any)?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{plan.frequency}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{plan.last_performed_date ? format(parseISO(plan.last_performed_date), 'dd/MM/yyyy') : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{format(parseISO(plan.next_due_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{(plan.assignee as any)?.full_name || '-'}</td>
                    <td className="px-4 py-3">{statusBadge(st)}</td>
                    <td className="px-4 py-3">
                      {canAct && (
                        <button onClick={() => setCompletingPlan(plan)} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 whitespace-nowrap">
                          ✓ บันทึก PM
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete PM Modal */}
      {completingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">บันทึก PM เสร็จสิ้น</h2>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{completingPlan.title}</p>
              <p className="text-gray-500 mt-1">กำหนดครั้งต่อไป: <strong>{calcNextDue(completingPlan.frequency, new Date().toISOString().split('T')[0])}</strong></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">บันทึกการทำงาน</label>
              <textarea rows={3} value={pmNotes} onChange={e => setPmNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="สรุปสิ่งที่ทำ..." />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCompletingPlan(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">ยกเลิก</button>
              <button onClick={() => completePM.mutate()} disabled={completePM.isPending} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {completePM.isPending ? '...' : 'ยืนยัน PM เสร็จสิ้น'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
