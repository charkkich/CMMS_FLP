import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { PmPlan } from '../../types';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function PMCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data: plans = [] } = useQuery<PmPlan[]>({
    queryKey: ['pm_plans_calendar'],
    queryFn: async () => {
      const { data } = await supabase.from('pm_plans').select('*').eq('is_active', true);
      return (data as any[]) || [];
    }
  });

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay();

  const plansOnDay = (day: Date) => plans.filter((p: PmPlan) => isSameDay(parseISO(p.next_due_date), day));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ปฏิทิน PM</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="text-lg font-semibold text-gray-900 dark:text-white w-40 text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: th })}
          </span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
          {days.map(day => {
            const dayPlans = plansOnDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={`min-h-[80px] p-1 rounded-lg border ${isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>
                  {format(day, 'd')}
                </div>
                {dayPlans.map((p: PmPlan) => (
                  <div key={p.id} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded px-1 py-0.5 mb-0.5 truncate" title={p.title}>
                    {p.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
