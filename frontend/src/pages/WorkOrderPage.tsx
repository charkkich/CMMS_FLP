import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FunnelIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import DataTable, { Column } from '../components/ui/DataTable';
import { PriorityBadge, WorkOrderStatusBadge } from '../components/ui/Badge';
import { WorkOrder } from '../types';
import { format } from 'date-fns';
import api from '../lib/api';

const mockWorkOrders: WorkOrder[] = [
  { id: 1, wo_number: 'WO-2024-0023', title: 'Pump seal replacement', asset_name: 'Pump A', technician_name: 'Mike T.', start_date: '2024-12-10', due_date: '2024-12-17', status: 'In Progress', priority: 'High', type: 'Corrective' },
  { id: 2, wo_number: 'WO-2024-0022', title: 'Generator maintenance', asset_name: 'Generator #1', technician_name: 'Sara M.', start_date: '2024-12-09', due_date: '2024-12-12', status: 'Waiting Spare Part', priority: 'Critical', type: 'Corrective' },
  { id: 3, wo_number: 'WO-2024-0021', title: 'Monthly PM - Air Compressor', asset_name: 'Air Compressor B', technician_name: 'Tom K.', start_date: '2024-12-08', due_date: '2024-12-15', status: 'Open', priority: 'Medium', type: 'Preventive' },
  { id: 4, wo_number: 'WO-2024-0020', title: 'Electrical panel inspection', asset_name: 'Panel 3', technician_name: 'Mike T.', start_date: '2024-12-05', due_date: '2024-12-10', completion_date: '2024-12-10', status: 'Completed', priority: 'Low', type: 'Preventive' },
  { id: 5, wo_number: 'WO-2024-0019', title: 'Irrigation system check', asset_name: 'Irrigation Z', technician_name: 'Sara M.', start_date: '2024-12-01', due_date: '2024-12-05', completion_date: '2024-12-04', status: 'Closed', priority: 'Medium', type: 'Preventive' },
];

const WorkOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    api.get('/work-orders')
      .then((res) => setWorkOrders(res.data))
      .catch(() => setWorkOrders(mockWorkOrders))
      .finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter ? workOrders.filter((w) => w.status === statusFilter) : workOrders;

  const columns: Column<WorkOrder>[] = [
    {
      key: 'wo_number',
      header: t('workorder.woNumber'),
      render: (row) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{row.wo_number}</span>
      ),
    },
    { key: 'title', header: 'Title' },
    { key: 'asset_name', header: t('asset.assetName') },
    { key: 'technician_name', header: t('workorder.assignedTechnician') },
    {
      key: 'due_date',
      header: t('workorder.dueDate'),
      render: (row) => row.due_date ? format(new Date(row.due_date), 'dd MMM yyyy') : '-',
    },
    {
      key: 'priority',
      header: t('common.priority'),
      render: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row) => (
        <WorkOrderStatusBadge status={row.status} label={t(`workorder.statuses.${row.status}`)} />
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          row.type === 'Preventive'
            ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
        }`}>
          {row.type}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('workorder.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{workOrders.length} total records</p>
        </div>
      </div>

      <Card noPadding>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-wrap">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('common.filter')}:</span>
          {['', 'Open', 'In Progress', 'Waiting Spare Part', 'Completed', 'Closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s ? t(`workorder.statuses.${s}`) : t('common.all')}
            </button>
          ))}
        </div>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => navigate(`/work-orders/${row.id}`)}
          />
        </div>
      </Card>
    </div>
  );
};

export default WorkOrderPage;
