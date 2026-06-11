import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, parseISO, subMonths, startOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: requests = [] } = useQuery({
    queryKey: ['report_requests', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase.from('maintenance_requests').select('status, priority, created_at').gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59');
      return (data as any[]) || [];
    }
  });

  const { data: workorders = [] } = useQuery({
    queryKey: ['report_wo', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase.from('work_orders').select('status, type, actual_hours, labor_cost, parts_cost, created_at').gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59');
      return (data as any[]) || [];
    }
  });

  const statusData = Object.entries(
    requests.reduce((acc: any, r: any) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const priorityData = Object.entries(
    requests.reduce((acc: any, r: any) => { acc[r.priority] = (acc[r.priority] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  const monthlyData = Array.from({ length: 4 }, (_, i) => {
    const month = subMonths(new Date(), 3 - i);
    const monthStr = format(month, 'yyyy-MM');
    const mr = requests.filter((r: any) => r.created_at.startsWith(monthStr)).length;
    const wo = workorders.filter((w: any) => w.created_at.startsWith(monthStr)).length;
    return { month: format(month, 'MMM', { locale: th }), mr, wo };
  });

  const totalLaborCost = workorders.reduce((s: number, w: any) => s + (w.labor_cost || 0), 0);
  const totalPartsCost = workorders.reduce((s: number, w: any) => s + (w.parts_cost || 0), 0);
  const completedWO = workorders.filter((w: any) => w.status === 'Completed').length;
  const totalHours = workorders.reduce((s: number, w: any) => s + (w.actual_hours || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายงาน</h1>
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ช่วงวันที่:</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
        <span className="text-gray-500">ถึง</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'คำขอทั้งหมด', value: requests.length, color: 'blue' },
          { label: 'ใบสั่งงานเสร็จสิ้น', value: completedWO, color: 'green' },
          { label: 'ค่าแรงรวม', value: `฿${totalLaborCost.toLocaleString()}`, color: 'purple' },
          { label: 'ค่าอะไหล่รวม', value: `฿${totalPartsCost.toLocaleString()}`, color: 'orange' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">คำขอตามสถานะ</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">คำขอ & ใบสั่งงานรายเดือน</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="mr" name="คำขอ" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="wo" name="ใบสั่งงาน" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
