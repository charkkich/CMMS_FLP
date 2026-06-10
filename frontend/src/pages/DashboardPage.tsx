import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import KpiCard from '../components/ui/KpiCard';
import Card from '../components/ui/Card';
import { PriorityBadge, RequestStatusBadge, WorkOrderStatusBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import api from '../lib/api';

// Mock data fallback
const mockKpis = {
  totalRequests: 142,
  openWorkOrders: 23,
  inProgress: 11,
  completed: 87,
  overdue: 5,
  pmDueThisMonth: 8,
  lowStockParts: 4,
};

const mockWoStatus = [
  { name: 'Open', value: 23, color: '#3b82f6' },
  { name: 'In Progress', value: 11, color: '#f59e0b' },
  { name: 'Waiting Part', value: 6, color: '#f97316' },
  { name: 'Completed', value: 87, color: '#22c55e' },
  { name: 'Closed', value: 15, color: '#6b7280' },
];

const mockMonthly = [
  { month: 'Jan', requests: 12 },
  { month: 'Feb', requests: 19 },
  { month: 'Mar', requests: 15 },
  { month: 'Apr', requests: 22 },
  { month: 'May', requests: 18 },
  { month: 'Jun', requests: 25 },
  { month: 'Jul', requests: 20 },
  { month: 'Aug', requests: 17 },
  { month: 'Sep', requests: 24 },
  { month: 'Oct', requests: 21 },
  { month: 'Nov', requests: 16 },
  { month: 'Dec', requests: 28 },
];

const mockTopAssets = [
  { asset_name: 'Pump Station A', count: 14 },
  { asset_name: 'Generator #1', count: 11 },
  { asset_name: 'Air Compressor B', count: 9 },
  { asset_name: 'Irrigation System Z', count: 7 },
  { asset_name: 'Electrical Panel 3', count: 5 },
];

const mockRecentRequests = [
  { id: 1, request_number: 'REQ-2024-0142', request_date: '2024-12-15', requester_name: 'John Doe', asset_name: 'Pump A', priority: 'High' as const, status: 'Submitted' as const },
  { id: 2, request_number: 'REQ-2024-0141', request_date: '2024-12-14', requester_name: 'Jane Smith', asset_name: 'Generator #1', priority: 'Critical' as const, status: 'Approved' as const },
  { id: 3, request_number: 'REQ-2024-0140', request_date: '2024-12-13', requester_name: 'Bob Wilson', asset_name: 'AC Unit 2', priority: 'Medium' as const, status: 'Converted to Work Order' as const },
  { id: 4, request_number: 'REQ-2024-0139', request_date: '2024-12-12', requester_name: 'Alice Brown', asset_name: 'Compressor B', priority: 'Low' as const, status: 'Rejected' as const },
];

const mockRecentCompleted = [
  { id: 1, wo_number: 'WO-2024-0087', title: 'Replace pump seal', asset_name: 'Pump A', technician_name: 'Mike T.', completion_date: '2024-12-14' },
  { id: 2, wo_number: 'WO-2024-0086', title: 'Generator oil change', asset_name: 'Generator #1', technician_name: 'Sara M.', completion_date: '2024-12-13' },
  { id: 3, wo_number: 'WO-2024-0085', title: 'Electrical panel inspection', asset_name: 'Panel 3', technician_name: 'Tom K.', completion_date: '2024-12-12' },
];

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [kpis, setKpis] = useState(mockKpis);
  const [woStatus] = useState(mockWoStatus);
  const [monthly] = useState(mockMonthly);
  const [topAssets] = useState(mockTopAssets);
  const [recentRequests] = useState(mockRecentRequests);
  const [recentCompleted] = useState(mockRecentCompleted);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard/stats')
      .then((res) => setKpis(res.data))
      .catch(() => {/* use mock */})
      .finally(() => setLoading(false));
  }, []);

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title={t('dashboard.totalRequests')}
          value={kpis.totalRequests}
          icon={<DocumentTextIcon />}
          color="blue"
          trend={12}
          trendLabel="vs last month"
        />
        <KpiCard
          title={t('dashboard.openWorkOrders')}
          value={kpis.openWorkOrders}
          icon={<ClipboardDocumentListIcon />}
          color="yellow"
        />
        <KpiCard
          title={t('dashboard.inProgress')}
          value={kpis.inProgress}
          icon={<WrenchScrewdriverIcon />}
          color="orange"
        />
        <KpiCard
          title={t('dashboard.completed')}
          value={kpis.completed}
          icon={<CheckCircleIcon />}
          color="green"
          trend={8}
          trendLabel="vs last month"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title={t('dashboard.overdue')}
          value={kpis.overdue}
          icon={<ExclamationTriangleIcon />}
          color="red"
        />
        <KpiCard
          title={t('dashboard.pmDueThisMonth')}
          value={kpis.pmDueThisMonth}
          icon={<CalendarIcon />}
          color="purple"
        />
        <KpiCard
          title={t('dashboard.lowStockParts')}
          value={kpis.lowStockParts}
          icon={<ArchiveBoxIcon />}
          color="orange"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart */}
        <Card title={t('dashboard.workOrderStatus')}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={woStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={90}
                innerRadius={40}
                dataKey="value"
              >
                {woStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17,24,39,0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend
                formatter={(value) => <span className="text-xs text-gray-600 dark:text-gray-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Bar chart - monthly */}
        <Card title={t('dashboard.monthlyRequests')} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17,24,39,0.9)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="requests" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Breakdown Assets */}
      <Card title={t('dashboard.topBreakdownAssets')}>
        <div className="space-y-3">
          {topAssets.map((asset, idx) => {
            const maxCount = topAssets[0].count;
            const pct = (asset.count / maxCount) * 100;
            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-bold flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                      {asset.asset_name}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white ml-2 flex-shrink-0">
                      {asset.count}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <Card title={t('dashboard.recentRequests')} noPadding>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('request.requestNumber')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.priority')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('common.date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-primary-600 dark:text-primary-400">
                      {req.request_number}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <RequestStatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(req.request_date), 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Recent Completed WOs */}
        <Card title={t('dashboard.recentCompleted')} noPadding>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{t('workorder.woNumber')}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {recentCompleted.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-medium text-primary-600 dark:text-primary-400">
                      {wo.wo_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      <div className="truncate max-w-[140px]">{wo.title}</div>
                      <div className="text-xs text-gray-400">{wo.technician_name}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(wo.completion_date), 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
