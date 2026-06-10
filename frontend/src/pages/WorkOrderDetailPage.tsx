import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PriorityBadge, WorkOrderStatusBadge } from '../components/ui/Badge';
import { WorkOrder } from '../types';
import { format } from 'date-fns';
import api from '../lib/api';
import toast from 'react-hot-toast';

const mockWO: WorkOrder = {
  id: 1,
  wo_number: 'WO-2024-0023',
  title: 'Pump seal replacement',
  asset_name: 'Pump A',
  technician_name: 'Mike T.',
  start_date: '2024-12-10',
  due_date: '2024-12-17',
  work_description: 'Replace worn pump seal to prevent leakage. Check bearings and lubricate.',
  root_cause: 'Wear and tear after 3 years of operation',
  corrective_action: 'Replace mechanical seal, check shaft alignment',
  labor_hours: 4,
  status: 'In Progress',
  priority: 'High',
  type: 'Corrective',
};

const WorkOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/work-orders/${id}`)
      .then((res) => setWo(res.data))
      .catch(() => setWo(mockWO))
      .finally(() => setLoading(false));
  }, [id]);

  const handleComplete = async () => {
    try {
      await api.patch(`/work-orders/${id}`, { status: 'Completed' });
      toast.success('Work order marked as completed');
      setWo((w) => w ? { ...w, status: 'Completed', completion_date: new Date().toISOString().slice(0, 10) } : w);
    } catch {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!wo) return <p>Work order not found</p>;

  const fields = [
    { label: t('workorder.woNumber'), value: wo.wo_number },
    { label: t('common.status'), value: <WorkOrderStatusBadge status={wo.status} label={t(`workorder.statuses.${wo.status}`)} /> },
    { label: t('asset.assetName'), value: wo.asset_name },
    { label: t('workorder.assignedTechnician'), value: wo.technician_name },
    { label: t('common.priority'), value: <PriorityBadge priority={wo.priority} /> },
    { label: 'Type', value: wo.type },
    { label: t('workorder.startDate'), value: wo.start_date ? format(new Date(wo.start_date), 'dd MMM yyyy') : '-' },
    { label: t('workorder.dueDate'), value: wo.due_date ? format(new Date(wo.due_date), 'dd MMM yyyy') : '-' },
    { label: t('workorder.completionDate'), value: wo.completion_date ? format(new Date(wo.completion_date), 'dd MMM yyyy') : '-' },
    { label: t('workorder.laborHours'), value: wo.labor_hours ? `${wo.labor_hours} hrs` : '-' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/work-orders')} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{wo.wo_number}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{wo.title}</p>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {fields.map((f, i) => (
            <div key={i}>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{f.label}</label>
              <div className="mt-1 text-sm text-gray-900 dark:text-white">{f.value}</div>
            </div>
          ))}
        </div>

        {wo.work_description && (
          <div className="mt-6">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('workorder.workDescription')}</label>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl p-4 leading-relaxed">{wo.work_description}</p>
          </div>
        )}

        {wo.root_cause && (
          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('workorder.rootCause')}</label>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">{wo.root_cause}</p>
          </div>
        )}

        {wo.corrective_action && (
          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('workorder.correctiveAction')}</label>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">{wo.corrective_action}</p>
          </div>
        )}

        {(wo.status === 'Open' || wo.status === 'In Progress') && (
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="primary" onClick={handleComplete}>{t('workorder.complete')}</Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WorkOrderDetailPage;
