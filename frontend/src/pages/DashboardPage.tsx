import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { WrenchScrewdriverIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon, CubeIcon } from '@heroicons/react/24/outline';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import KpiCard from '../components/ui/KpiCard';
import Card from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { format, subMonths } from 'date-fns';

const COLORS: Record<string, string> = { Open:'#f59e0b', Assigned:'#3b82f6', 'In Progress':'#8b5cf6', Completed:'#22c55e', Cancelled:'#6b7280' };

const DashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const [mr, wo, pm, sp] = await Promise.all([
        supabase.from('maintenance_requests').select('id, request_number, title, status, priority, created_at'),
        supabase.from('work_orders').select('status, type, created_at, actual_hours, actual_end'),
        supabase.from('pm_plans').select('next_due_date, is_active'),
        supabase.from('spare_parts').select('current_stock, minimum_stock'),
      ]);
      const requests = (mr.data as any[]) || []; const workOrders = (wo.data as any[]) || [];
      const pmPlans = (pm.data as any[]) || [];  const parts = (sp.data as any[]) || [];
      const today = new Date();

      // KPI: open/submitted requests awaiting action
      const openRequests = requests.filter((r: any) => ['Submitted', 'Approved'].includes(r.status)).length;

      // KPI: work orders not yet closed/completed/cancelled
      const activeWOs = workOrders.filter((w: any) =>
        !['Completed', 'Closed', 'Cancelled'].includes(w.status)
      ).length;

      // KPI: PM plans past their next_due_date (only active plans with a valid date)
      const overdue = pmPlans.filter((p: any) =>
        p.is_active && p.next_due_date && new Date(p.next_due_date) < today
      ).length;

      // KPI: parts at or below minimum (only track items that have a minimum set > 0)
      const lowStock = parts.filter((p: any) =>
        p.minimum_stock > 0 && p.current_stock <= p.minimum_stock
      ).length;

      const woByStatus = Object.entries(
        workOrders.reduce((a: any, w: any) => { a[w.status] = (a[w.status] || 0) + 1; return a; }, {})
      ).map(([name, value]) => ({ name, value }));

      // Monthly breakdown: corrective WOs vs preventive WOs (both from work_orders, consistent)
      const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        const m = format(d, 'yyyy-MM');
        return {
          month: format(d, 'MMM'),
          corrective: workOrders.filter((w: any) => w.type === 'Corrective' && w.created_at?.startsWith(m)).length,
          preventive: workOrders.filter((w: any) => w.type === 'Preventive' && w.created_at?.startsWith(m)).length,
        };
      });

      return { openRequests, activeWOs, overdue, lowStock, woByStatus, monthly, requests, workOrders };
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Open Requests" value={isLoading ? '...' : data?.openRequests ?? 0} icon={<ClipboardDocumentListIcon className="h-5 w-5" />} color="blue" />
        <KpiCard title="Active Work Orders" value={isLoading ? '...' : data?.activeWOs ?? 0} icon={<WrenchScrewdriverIcon className="h-5 w-5" />} color="yellow" />
        <KpiCard title="Overdue PM Plans" value={isLoading ? '...' : data?.overdue ?? 0} icon={<ExclamationTriangleIcon className="h-5 w-5" />} color="red" />
        <KpiCard title="Low Stock Items" value={isLoading ? '...' : data?.lowStock ?? 0} icon={<CubeIcon className="h-5 w-5" />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Work Order Status Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data?.woByStatus||[]} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {(data?.woByStatus||[]).map((e: any) => <Cell key={e.name} fill={COLORS[e.name]||'#94a3b8'} />)}
              </Pie>
              <Tooltip />
              <Legend formatter={(v: any) => <span className="text-xs">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Monthly Work Orders (Last 6 Months)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.monthly||[]} margin={{ top:5, right:10, left:-20, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize:11, fill:'#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11, fill:'#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor:'rgba(17,24,39,0.9)', border:'none', borderRadius:'8px', color:'#fff', fontSize:'12px' }} />
              <Legend formatter={(v: any) => <span className="text-xs">{v}</span>} />
              <Bar dataKey="corrective" name="Corrective" fill="#f59e0b" radius={[3,3,0,0]} maxBarSize={20} />
              <Bar dataKey="preventive" name="Preventive" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Recent Maintenance Requests">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 dark:border-gray-700">
              {['Request #','Title','Priority','Status','Date'].map(h => (
                <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {(data?.requests || []).slice(0, 5).map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="py-2 px-3 font-mono text-xs text-gray-500">{r.request_number || `#${r.id}`}</td>
                  <td className="py-2 px-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">{r.title || '-'}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.priority === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      r.priority === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      r.priority === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>{r.priority || '-'}</span>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      r.status === 'In Progress' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      r.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>{r.status}</span>
                  </td>
                  <td className="py-2 px-3 text-gray-500 text-xs">
                    {r.created_at ? format(new Date(r.created_at), 'dd MMM yyyy') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
export default DashboardPage;
