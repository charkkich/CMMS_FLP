import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { PmPlan } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  format, parseISO, isPast, isWithinInterval, addDays,
  startOfMonth, endOfMonth, isWithinInterval as inRange,
} from 'date-fns';
import {
  CalendarDaysIcon, ExclamationTriangleIcon, CheckCircleIcon,
  PlusIcon, ClockIcon, ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// ─── helpers ────────────────────────────────────────────────────────────────

const calcNextDue = (frequency: string, from: Date): string => {
  const d = new Date(from);
  switch (frequency) {
    case 'Daily':       d.setDate(d.getDate() + 1);          break;
    case 'Weekly':      d.setDate(d.getDate() + 7);          break;
    case 'Monthly':     d.setMonth(d.getMonth() + 1);        break;
    case 'Quarterly':   d.setMonth(d.getMonth() + 3);        break;
    case 'Semi-Annual': d.setMonth(d.getMonth() + 6);        break;
    case 'Annual':      d.setFullYear(d.getFullYear() + 1);  break;
  }
  return d.toISOString().split('T')[0];
};

const today = () => new Date().toISOString().split('T')[0];

// ─── component ───────────────────────────────────────────────────────────────

export default function PMSchedulePage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // modal state
  const [completingPlan, setCompletingPlan] = useState<PmPlan | null>(null);
  const [performedDate, setPerformedDate]   = useState(today());
  const [pmNotes, setPmNotes]               = useState('');
  const [checklistResults, setChecklistResults] = useState<Record<string, boolean>>({});
  const [checklistError, setChecklistError] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // table filter
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due-soon' | 'upcoming'>('all');

  // ── data ──────────────────────────────────────────────────────────────────

  const { data: plans = [], isLoading } = useQuery<PmPlan[]>({
    queryKey: ['pm_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pm_plans')
        .select('*, asset:assets(name,asset_code), assignee:profiles(full_name)')
        .eq('is_active', true)
        .order('next_due_date');
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // ── status helpers ────────────────────────────────────────────────────────

  const getStatus = (plan: PmPlan) => {
    try {
      const due = parseISO(plan.next_due_date);
      if (isPast(due)) return 'overdue';
      if (isWithinInterval(due, { start: new Date(), end: addDays(new Date(), 7) })) return 'due-soon';
      return 'upcoming';
    } catch { return 'upcoming'; }
  };

  // ── KPI counts ───────────────────────────────────────────────────────────

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd   = endOfMonth(now);

  const overdueList  = plans.filter((p: any) => getStatus(p) === 'overdue');
  const dueSoonList  = plans.filter((p: any) => getStatus(p) === 'due-soon');
  const dueThisMonth = plans.filter((p: any) => {
    try { return inRange(parseISO(p.next_due_date), { start: monthStart, end: monthEnd }); } catch { return false; }
  });
  const completedThisMonth = plans.filter((p: any) => {
    if (!p.last_performed_date) return false;
    try { return inRange(parseISO(p.last_performed_date), { start: monthStart, end: monthEnd }); } catch { return false; }
  });

  // ── open completion modal ─────────────────────────────────────────────────

  const openModal = (plan: PmPlan) => {
    const initial: Record<string, boolean> = {};
    (plan.checklist || []).forEach((item: any) => { initial[item] = false; });
    setChecklistResults(initial);
    setPerformedDate(today());
    setPmNotes('');
    setChecklistError(false);
    setSubmitAttempted(false);
    setCompletingPlan(plan);
  };

  const toggleItem = (item: string) => {
    setChecklistResults(prev => {
      const updated = { ...prev, [item]: !prev[item] };
      // Clear error if all items are now checked
      if (Object.values(updated).every(Boolean)) setChecklistError(false);
      return updated;
    });
  };

  const checklist = completingPlan?.checklist || [];
  const checkedCount = checklist.filter((item: any) => checklistResults[item] === true).length;
  const allChecked = checklist.length === 0 || checkedCount === checklist.length;

  // ── mutation ──────────────────────────────────────────────────────────────

  const completePM = useMutation({
    mutationFn: async () => {
      if (!completingPlan) return;

      // Validate checklist — block if any item unchecked
      if (!allChecked) {
        setChecklistError(true);
        setSubmitAttempted(true);
        throw new Error('checklist_incomplete');
      }

      const fromDate = new Date(performedDate);
      const nextDue  = calcNextDue(completingPlan.frequency, fromDate);

      const { error: recErr } = await supabase.from('pm_records').insert({
        plan_id:           completingPlan.id,
        performed_by:      user?.id,
        performed_date:    performedDate,
        notes:             pmNotes || null,
        checklist_results: checklistResults,
      });
      if (recErr) throw recErr;

      const { error: planErr } = await supabase
        .from('pm_plans')
        .update({
          last_performed_date: performedDate,
          next_due_date:       nextDue,
          updated_at:          new Date().toISOString(),
        })
        .eq('id', completingPlan.id);
      if (planErr) throw planErr;

      return nextDue;
    },
    onSuccess: (nextDue) => {
      qc.invalidateQueries({ queryKey: ['pm_plans'] });
      qc.invalidateQueries({ queryKey: ['dashboard-supervisor'] });
      qc.invalidateQueries({ queryKey: ['dashboard-technician'] });
      toast.success(`บันทึก PM เสร็จสิ้น — กำหนดครั้งต่อไป: ${nextDue}`);
      setCompletingPlan(null);
      setPmNotes('');
    },
    onError: (e: any) => {
      if (e.message !== 'checklist_incomplete') toast.error(e.message);
    },
  });

  const handleSubmit = () => {
    if (!allChecked) {
      setChecklistError(true);
      setSubmitAttempted(true);
      return;
    }
    completePM.mutate();
  };

  // ── role check ────────────────────────────────────────────────────────────

  const canAct = user?.role === 'technician' || user?.role === 'supervisor' || user?.role === 'admin';

  // ── status badge ──────────────────────────────────────────────────────────

  const statusBadge = (s: string) => {
    if (s === 'overdue')
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">เกินกำหนด</span>;
    if (s === 'due-soon')
      return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">ใกล้ครบกำหนด</span>;
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ยังไม่ถึงกำหนด</span>;
  };

  // ── filtered rows ─────────────────────────────────────────────────────────

  const displayed = filterStatus === 'all'
    ? plans
    : plans.filter((p: any) => getStatus(p) === filterStatus);

  // ── loading ───────────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="p-8 text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตารางบำรุงรักษาเชิงป้องกัน</h1>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <Link
            to="/pm/schedule/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <PlusIcon className="h-4 w-4" /> เพิ่มแผน PM
          </Link>
        )}
      </div>

      {/* KPI Cards — 4 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Overdue */}
        <button
          onClick={() => setFilterStatus(filterStatus === 'overdue' ? 'all' : 'overdue')}
          className={`rounded-xl p-4 border text-left transition-all ${filterStatus === 'overdue' ? 'ring-2 ring-red-500' : ''} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`}
        >
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-700 dark:text-red-400 text-sm">เกินกำหนด</span>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-1">{overdueList.length}</p>
        </button>

        {/* Due this week */}
        <button
          onClick={() => setFilterStatus(filterStatus === 'due-soon' ? 'all' : 'due-soon')}
          className={`rounded-xl p-4 border text-left transition-all ${filterStatus === 'due-soon' ? 'ring-2 ring-yellow-500' : ''} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800`}
        >
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-700 dark:text-yellow-400 text-sm">ใกล้ครบกำหนด (7 วัน)</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{dueSoonList.length}</p>
        </button>

        {/* Due this month */}
        <button
          onClick={() => setFilterStatus('all')}
          className="rounded-xl p-4 border text-left transition-all bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-700 dark:text-blue-400 text-sm">ครบกำหนดเดือนนี้</span>
          </div>
          <p className="text-3xl font-bold text-blue-600 mt-1">{dueThisMonth.length}</p>
        </button>

        {/* Completed this month */}
        <button
          onClick={() => setFilterStatus('all')}
          className="rounded-xl p-4 border text-left transition-all bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
        >
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-700 dark:text-green-400 text-sm">เสร็จสิ้นเดือนนี้</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mt-1">{completedThisMonth.length}</p>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'overdue', 'due-soon', 'upcoming'] as const).map((f: any) => {
          const labels: Record<string, string> = {
            all: 'ทั้งหมด',
            overdue: 'เกินกำหนด',
            'due-soon': 'ใกล้ครบกำหนด',
            upcoming: 'ยังไม่ถึง',
          };
          return (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterStatus === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['รหัสแผน', 'เครื่องจักร', 'ชื่อแผน', 'ความถี่', 'ครั้งถัดไป', 'ครั้งล่าสุด', 'สถานะ', ''].map((h: any) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayed.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
              )}
              {displayed.map((plan: PmPlan) => {
                const st = getStatus(plan);
                const hasChecklist = (plan.checklist || []).length > 0;
                return (
                  <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{plan.plan_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      <div>{(plan.asset as any)?.name || '-'}</div>
                      <div className="text-xs text-gray-400 font-mono">{(plan.asset as any)?.asset_code || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-[180px]">
                      <div className="font-medium truncate" title={plan.title}>{plan.title}</div>
                      {hasChecklist && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                          <ClipboardDocumentListIcon className="h-3 w-3" />
                          {(plan.checklist || []).length} รายการตรวจสอบ
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{plan.frequency}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {plan.next_due_date ? format(parseISO(plan.next_due_date), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {plan.last_performed_date ? format(parseISO(plan.last_performed_date), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3">{statusBadge(st)}</td>
                    <td className="px-4 py-3">
                      {canAct && (
                        <button
                          onClick={() => openModal(plan)}
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 whitespace-nowrap transition-colors"
                        >
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

      {/* ── PM Completion Modal ── */}
      {completingPlan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">

              {/* Modal title */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">บันทึกการทำ PM</h2>
                <button
                  onClick={() => setCompletingPlan(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                  aria-label="ปิด"
                >
                  ×
                </button>
              </div>

              {/* Plan summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900 dark:text-white">{completingPlan.title}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                  {(completingPlan.asset as any)?.name || ''} · {completingPlan.frequency}
                </p>
                {completingPlan.plan_number && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{completingPlan.plan_number}</p>
                )}
              </div>

              {/* ── Checklist section (MANDATORY) ── */}
              {checklist.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <ClipboardDocumentListIcon className="h-4 w-4 text-blue-500" />
                      รายการตรวจสอบ
                      <span className="text-xs font-normal text-red-500 ml-1">* จำเป็น</span>
                    </h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      allChecked
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {checkedCount}/{checklist.length}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-3">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${allChecked ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${checklist.length > 0 ? (checkedCount / checklist.length) * 100 : 0}%` }}
                    />
                  </div>

                  <div className={`space-y-2 border rounded-lg p-3 transition-colors ${
                    submitAttempted && !allChecked
                      ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/10'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50'
                  }`}>
                    {checklist.map((item, idx) => (
                      <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={!!checklistResults[item]}
                          onChange={() => toggleItem(item)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer flex-shrink-0"
                        />
                        <span className={`text-sm flex-1 transition-colors ${
                          checklistResults[item]
                            ? 'line-through text-gray-400 dark:text-gray-500'
                            : 'text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white'
                        }`}>
                          {idx + 1}. {item}
                        </span>
                        {checklistResults[item] && (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                      </label>
                    ))}
                  </div>

                  {/* Checklist validation error */}
                  {(checklistError || (submitAttempted && !allChecked)) && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                      <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                      กรุณาทำรายการตรวจสอบให้ครบทุกข้อ
                    </div>
                  )}

                  {/* All checked confirmation */}
                  {allChecked && checklist.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
                      <CheckCircleIcon className="h-4 w-4" />
                      ครบทุกรายการแล้ว
                    </div>
                  )}
                </div>
              )}

              {/* No checklist notice */}
              {checklist.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2">
                  แผน PM นี้ไม่มีรายการตรวจสอบ
                </div>
              )}

              {/* Performed date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  วันที่ทำ PM <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={performedDate}
                  onChange={e => setPerformedDate(e.target.value)}
                  max={today()}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Next due preview */}
              <div className="text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                กำหนดครั้งต่อไป:{' '}
                <strong className="text-blue-700 dark:text-blue-300">
                  {performedDate ? format(new Date(calcNextDue(completingPlan.frequency, new Date(performedDate))), 'dd/MM/yyyy') : '-'}
                </strong>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  บันทึกเพิ่มเติม <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
                </label>
                <textarea
                  rows={3}
                  value={pmNotes}
                  onChange={e => setPmNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="สรุปสิ่งที่ทำ ปัญหาที่พบ..."
                />
              </div>

              {/* Submit error summary if checklist incomplete */}
              {submitAttempted && !allChecked && (
                <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  <p className="font-semibold mb-1">ไม่สามารถบันทึก PM ได้</p>
                  <p>กรุณาทำรายการตรวจสอบให้ครบทุกข้อก่อนกดยืนยัน ({checkedCount}/{checklist.length} รายการ)</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setCompletingPlan(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={completePM.isPending}
                  title={!allChecked ? 'กรุณาทำรายการตรวจสอบให้ครบทุกข้อ' : undefined}
                  className={`px-4 py-2 text-white text-sm rounded-lg transition-colors disabled:cursor-not-allowed ${
                    allChecked
                      ? 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                      : 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70'
                  }`}
                >
                  {completePM.isPending ? 'กำลังบันทึก...' : 'ยืนยัน PM เสร็จสิ้น'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
