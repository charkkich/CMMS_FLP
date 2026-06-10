import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable, { Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import { PmPlan } from '../types';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import api from '../lib/api';

const mockPlans: PmPlan[] = [
  { id: 1, pm_code: 'PM-001', asset_id: 1, asset_name: 'Main Pump A', title: 'Monthly pump inspection', frequency: 'Monthly', responsible_name: 'Mike T.', checklist: [{ item: 'Check seal', required: true }, { item: 'Lubricate bearings', required: true }], next_due_date: '2024-12-20', last_completed_date: '2024-11-20', is_active: true },
  { id: 2, pm_code: 'PM-002', asset_id: 2, asset_name: 'Generator #1', title: 'Quarterly generator service', frequency: 'Quarterly', responsible_name: 'Sara M.', checklist: [{ item: 'Check oil', required: true }, { item: 'Test run', required: true }], next_due_date: '2024-12-10', last_completed_date: '2024-09-10', is_active: true },
  { id: 3, pm_code: 'PM-003', asset_id: 3, asset_name: 'Air Compressor B', title: 'Annual compressor overhaul', frequency: 'Annual', responsible_name: 'Tom K.', checklist: [{ item: 'Replace filters', required: true }], next_due_date: '2025-03-01', last_completed_date: '2024-03-01', is_active: true },
  { id: 4, pm_code: 'PM-004', asset_id: 4, asset_name: 'Irrigation System Z', title: 'Semi-annual irrigation check', frequency: 'Semi-Annual', responsible_name: 'Mike T.', checklist: [{ item: 'Check sprinklers', required: false }], next_due_date: '2025-01-15', last_completed_date: '2024-07-15', is_active: true },
];

const PmSchedulePage: React.FC = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<PmPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pm-plans')
      .then((res) => setPlans(res.data))
      .catch(() => setPlans(mockPlans))
      .finally(() => setLoading(false));
  }, []);

  const getDueStatus = (date?: string) => {
    if (!date) return null;
    const d = new Date(date);
    if (isPast(d)) return 'overdue';
    if (isWithinInterval(d, { start: new Date(), end: addDays(new Date(), 7) })) return 'upcoming';
    return 'ok';
  };

  const columns: Column<PmPlan>[] = [
    {
      key: 'pm_code',
      header: t('pm.pmCode'),
      render: (row) => <span className="font-medium text-primary-600 dark:text-primary-400">{row.pm_code}</span>,
    },
    { key: 'title', header: 'Title' },
    { key: 'asset_name', header: t('asset.assetName') },
    {
      key: 'frequency',
      header: t('pm.frequency'),
      render: (row) => <Badge>{t(`pm.frequencies.${row.frequency}`)}</Badge>,
    },
    { key: 'responsible_name', header: t('pm.responsiblePerson') },
    {
      key: 'last_completed_date',
      header: t('pm.lastCompleted'),
      render: (row) => row.last_completed_date ? format(new Date(row.last_completed_date), 'dd MMM yyyy') : '-',
    },
    {
      key: 'next_due_date',
      header: t('pm.nextDueDate'),
      render: (row) => {
        const status = getDueStatus(row.next_due_date);
        return (
          <div className="flex items-center gap-2">
            <span>{row.next_due_date ? format(new Date(row.next_due_date), 'dd MMM yyyy') : '-'}</span>
            {status === 'overdue' && (
              <span className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                {t('pm.overdue')}
              </span>
            )}
            {status === 'upcoming' && (
              <span className="text-xs font-medium text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full">
                {t('pm.upcoming')}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'is_active',
      header: 'Active',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          row.is_active
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('pm.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{plans.length} PM plans</p>
        </div>
        <Button variant="primary" icon={<PlusIcon className="h-4 w-4" />}>
          {t('common.create')} PM Plan
        </Button>
      </div>

      <Card noPadding>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={plans}
            loading={loading}
            keyExtractor={(row) => row.id}
          />
        </div>
      </Card>
    </div>
  );
};

export default PmSchedulePage;
