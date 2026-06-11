import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { PmPlan } from '../../types';
import { format, parseISO, isPast, isWithinInterval, addDays } from 'date-fns';
import { CalendarDaysIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function PMSchedulePage() {
  const { data: plans = [], isLoading } = useQuery<PmPlan[]>({
    queryKey: ['pm_plans'],
    queryFn: async () => {
      const { data } = await supabase.from('pm_plans').select('*, asset:assets(name,asset_code), assignee:profiles(full_name)').eq('is_active', true).order('next_due_date');
      return (data as any[]) || [];
    }
  });

  const getStatus = (plan: PmPlan) => {
    const due = parseISO(plan.next_due_date);
    if (isPast(due)) return 'overdue';
    if (isWithinInterval(due, { start: new Date(), end: addDays(new Date(), 7) })) return 'due-soon';
    return 'upcoming';
  };

  const statusBadge = (s: string) => {
    if (s === 'overdue') return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">เกินกำหนด</span>;
    if (s === 'due-soon') return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">ใกล้ครบกำหนด</span>;
    return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ปกติ</span>;
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>;

  const overdue = plans.filter((p: PmPlan) => getStatus(p) === 'overdue');
  const dueSoon = plans.filter((p: PmPlan) => getStatus(p) === 'due-soon');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ตารางบำรุงรักษาเชิงป้องกัน</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-700 dark:text-red-400">เกินกำหนด</span>
          </div>
          <p className="text-3xl font-bold text-red-600 mt-1">{overdue.length}</p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-700 dark:text-yellow-400">ใกล้ครบกำหนด (7 วัน)</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600 mt-1">{dueSoon.length}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-700 dark:text-green-400">แผนทั้งหมด</span>
          </div>
          <p className="text-3xl font-bold text-green-600 mt-1">{plans.length}</p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['เลขแผน','ชื่อแผน','เครื่องจักร','ความถี่','ครั้งถัดไป','ผู้รับผิดชอบ','สถานะ'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {plans.map((plan: PmPlan) => (
              <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{plan.plan_number}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{plan.title}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{(plan.asset as any)?.name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{plan.frequency}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{format(parseISO(plan.next_due_date), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{(plan.assignee as any)?.full_name || '-'}</td>
                <td className="px-4 py-3">{statusBadge(getStatus(plan))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
