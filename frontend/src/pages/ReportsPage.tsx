import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentArrowDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import toast from 'react-hot-toast';

const monthlyData = [
  { month: 'Jan', corrective: 8, preventive: 5 },
  { month: 'Feb', corrective: 12, preventive: 5 },
  { month: 'Mar', corrective: 9, preventive: 6 },
  { month: 'Apr', corrective: 15, preventive: 5 },
  { month: 'May', corrective: 11, preventive: 6 },
  { month: 'Jun', corrective: 14, preventive: 7 },
  { month: 'Jul', corrective: 10, preventive: 5 },
  { month: 'Aug', corrective: 13, preventive: 6 },
  { month: 'Sep', corrective: 16, preventive: 7 },
  { month: 'Oct', corrective: 12, preventive: 5 },
  { month: 'Nov', corrective: 9, preventive: 6 },
  { month: 'Dec', corrective: 11, preventive: 8 },
];

const laborHoursData = [
  { month: 'Jan', hours: 45 },
  { month: 'Feb', hours: 62 },
  { month: 'Mar', hours: 51 },
  { month: 'Apr', hours: 78 },
  { month: 'May', hours: 59 },
  { month: 'Jun', hours: 83 },
  { month: 'Jul', hours: 56 },
  { month: 'Aug', hours: 70 },
  { month: 'Sep', hours: 88 },
  { month: 'Oct', hours: 64 },
  { month: 'Nov', hours: 48 },
  { month: 'Dec', hours: 73 },
];

const reportTypes = [
  { key: 'maintenance-summary', label: 'Maintenance Summary Report', description: 'Overview of all maintenance activities' },
  { key: 'work-order-status', label: 'Work Order Status Report', description: 'Current status of all work orders' },
  { key: 'asset-maintenance', label: 'Asset Maintenance History', description: 'Repair and PM history per asset' },
  { key: 'pm-compliance', label: 'PM Compliance Report', description: 'Preventive maintenance completion rate' },
  { key: 'spare-parts-usage', label: 'Spare Parts Usage Report', description: 'Stock movements and consumption' },
  { key: 'labor-hours', label: 'Labor Hours Report', description: 'Technician hours and productivity' },
];

const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState('2024-12-31');

  const handleExport = (type: string, format: string) => {
    toast.success(`Exporting ${type} as ${format}...`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('reports.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Generate and export maintenance reports</p>
      </div>

      {/* Date Range */}
      <Card title={t('reports.dateRange')}>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="mt-4">
            <Button variant="primary" icon={<ChartBarIcon className="h-4 w-4" />}>
              {t('reports.generate')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Report types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTypes.map((report) => (
          <div
            key={report.key}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{report.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{report.description}</p>
              </div>
              <DocumentArrowDownIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleExport(report.label, 'Excel')}
                className="flex-1 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                Excel
              </button>
              <button
                onClick={() => handleExport(report.label, 'PDF')}
                className="flex-1 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport(report.label, 'CSV')}
                className="flex-1 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                CSV
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Work Orders by Month (Corrective vs Preventive)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              <Legend formatter={(v) => <span className="text-xs text-gray-600 dark:text-gray-400">{v}</span>} />
              <Bar dataKey="corrective" name="Corrective" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="preventive" name="Preventive" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Labor Hours by Month">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={laborHoursData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;
