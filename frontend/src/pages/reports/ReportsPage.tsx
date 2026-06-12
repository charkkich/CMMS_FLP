import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

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

  // Build monthly buckets from the selected date range (up to 6 months)
  const monthsInRange = (() => {
    const from = new Date(dateFrom); const to = new Date(dateTo);
    const months: Date[] = [];
    let cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to && months.length < 6) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
    return months;
  })();

  const monthlyData = monthsInRange.map(month => {
    const monthStr = format(month, 'yyyy-MM');
    const mr = requests.filter((r: any) => r.created_at?.startsWith(monthStr)).length;
    const wo = workorders.filter((w: any) => w.created_at?.startsWith(monthStr)).length;
    return { month: format(month, 'MMM yy', { locale: th }), mr, wo };
  });

  const totalLaborCost = workorders.reduce((s: number, w: any) => s + (w.labor_cost || 0), 0);
  const totalPartsCost = workorders.reduce((s: number, w: any) => s + (w.parts_cost || 0), 0);
  // Count both Completed and Closed as "done" work orders
  const completedWO = workorders.filter((w: any) => ['Completed', 'Closed'].includes(w.status)).length;
  const exportRequests = () => {
    const headers = ['Status', 'Priority', 'Date'];
    const rows = requests.map((r: any) => [r.status, r.priority, r.created_at?.split('T')[0] || '']);
    downloadCsv(`requests_${dateFrom}_${dateTo}.csv`, [headers, ...rows]);
  };

  const exportWorkOrders = () => {
    const headers = ['Status', 'Type', 'Actual Hours', 'Labor Cost', 'Parts Cost', 'Date'];
    const rows = workorders.map((w: any) => [w.status, w.type, w.actual_hours || 0, w.labor_cost || 0, w.parts_cost || 0, w.created_at?.split('T')[0] || '']);
    downloadCsv(`workorders_${dateFrom}_${dateTo}.csv`, [headers, ...rows]);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายงาน</h1>
        <div className="flex gap-2">
          <button onClick={exportRequests} className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            <ArrowDownTrayIcon className="h-4 w-4" /> Export คำขอ
          </button>
          <button onClick={exportWorkOrders} className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            <ArrowDownTrayIcon className="h-4 w-4" /> Export ใบสั่งงาน
          </button>
        </div>
      </div>
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ช่วงวันที่:</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
        <span className="text-gray-500">ถึง</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'คำขอทั้งหมด', value: requests.length, color: 'blue' },
          { label: 'ใบสั่งงานเสร็จ/ปิด', value: completedWO, color: 'green' },
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
