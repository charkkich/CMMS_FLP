import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable, { Column } from '../components/ui/DataTable';
import { PriorityBadge, RequestStatusBadge } from '../components/ui/Badge';
import { MaintenanceRequest } from '../types';
import { format } from 'date-fns';
import api from '../lib/api';

const mockRequests: MaintenanceRequest[] = [
  { id: 1, request_number: 'REQ-2024-0142', request_date: '2024-12-15', requester_id: 1, requester_name: 'John Doe', department: 'Operations', location: 'Building A', asset_name: 'Pump A', priority: 'High', problem_description: 'Pump making unusual noise', status: 'Submitted' },
  { id: 2, request_number: 'REQ-2024-0141', request_date: '2024-12-14', requester_id: 2, requester_name: 'Jane Smith', department: 'Engineering', location: 'Plant B', asset_name: 'Generator #1', priority: 'Critical', problem_description: 'Generator not starting', status: 'Approved' },
  { id: 3, request_number: 'REQ-2024-0140', request_date: '2024-12-13', requester_id: 3, requester_name: 'Bob Wilson', department: 'Facilities', location: 'Office C', asset_name: 'AC Unit 2', priority: 'Medium', problem_description: 'AC not cooling properly', status: 'Converted to Work Order' },
  { id: 4, request_number: 'REQ-2024-0139', request_date: '2024-12-12', requester_id: 4, requester_name: 'Alice Brown', department: 'Production', location: 'Floor D', asset_name: 'Compressor B', priority: 'Low', problem_description: 'Minor oil leak detected', status: 'Rejected' },
  { id: 5, request_number: 'REQ-2024-0138', request_date: '2024-12-11', requester_id: 1, requester_name: 'John Doe', department: 'Operations', location: 'Building A', asset_name: 'Pump C', priority: 'High', problem_description: 'Pump vibration issue', status: 'Submitted' },
];

const MaintenanceRequestPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    api.get('/maintenance-requests')
      .then((res) => setRequests(res.data))
      .catch(() => setRequests(mockRequests))
      .finally(() => setLoading(false));
  }, []);

  const filtered = statusFilter ? requests.filter((r) => r.status === statusFilter) : requests;

  const columns: Column<MaintenanceRequest>[] = [
    {
      key: 'request_number',
      header: t('request.requestNumber'),
      render: (row) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">{row.request_number}</span>
      ),
    },
    {
      key: 'request_date',
      header: t('request.requestDate'),
      render: (row) => format(new Date(row.request_date), 'dd MMM yyyy'),
    },
    { key: 'requester_name', header: t('request.requester') },
    { key: 'asset_name', header: t('request.asset') },
    {
      key: 'priority',
      header: t('common.priority'),
      render: (row) => (
        <PriorityBadge
          priority={row.priority}
          label={t(`request.priorities.${row.priority}`)}
        />
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (row) => (
        <RequestStatusBadge
          status={row.status}
          label={t(`request.statuses.${row.status}`)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('request.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {requests.length} total records
          </p>
        </div>
        <Button
          variant="primary"
          icon={<PlusIcon className="h-4 w-4" />}
          onClick={() => navigate('/requests/new')}
        >
          {t('request.createNew')}
        </Button>
      </div>

      <Card noPadding>
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-wrap">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('common.filter')}:</span>
          {['', 'Submitted', 'Approved', 'Rejected', 'Converted to Work Order'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {s ? t(`request.statuses.${s}`) : t('common.all')}
            </button>
          ))}
        </div>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => navigate(`/requests/${row.id}`)}
          />
        </div>
      </Card>
    </div>
  );
};

export default MaintenanceRequestPage;
