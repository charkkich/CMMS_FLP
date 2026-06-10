import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { PriorityBadge, RequestStatusBadge } from '../components/ui/Badge';
import { MaintenanceRequest } from '../types';
import { format } from 'date-fns';
import api from '../lib/api';
import toast from 'react-hot-toast';

const mockRequest: MaintenanceRequest = {
  id: 1,
  request_number: 'REQ-2024-0142',
  request_date: '2024-12-15',
  requester_id: 1,
  requester_name: 'John Doe',
  department: 'Operations',
  location: 'Building A',
  asset_name: 'Pump A',
  priority: 'High',
  problem_description: 'Pump is making unusual grinding noise during operation. The noise started 3 days ago and seems to be getting worse. Possible bearing failure.',
  status: 'Submitted',
};

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/maintenance-requests/${id}`)
      .then((res) => setRequest(res.data))
      .catch(() => setRequest(mockRequest))
      .finally(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    try {
      await api.post(`/maintenance-requests/${id}/approve`);
      toast.success('Request approved');
      setRequest((r) => r ? { ...r, status: 'Approved' } : r);
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async () => {
    try {
      await api.post(`/maintenance-requests/${id}/reject`);
      toast.success('Request rejected');
      setRequest((r) => r ? { ...r, status: 'Rejected' } : r);
    } catch {
      toast.error('Failed to reject');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!request) return <p className="text-gray-500">Request not found.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/requests')}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{request.request_number}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('request.title')} Details
          </p>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('request.requestDate')}</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {format(new Date(request.request_date), 'dd MMMM yyyy')}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('common.status')}</label>
            <div className="mt-1">
              <RequestStatusBadge status={request.status} label={t(`request.statuses.${request.status}`)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('request.requester')}</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{request.requester_name}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('request.department')}</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{request.department}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('request.location')}</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{request.location}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('request.asset')}</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">{request.asset_name}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('common.priority')}</label>
            <div className="mt-1">
              <PriorityBadge priority={request.priority} label={t(`request.priorities.${request.priority}`)} />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('request.problemDescription')}</label>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            {request.problem_description}
          </p>
        </div>

        {request.status === 'Submitted' && (
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="danger"
              icon={<XMarkIcon className="h-4 w-4" />}
              onClick={handleReject}
            >
              {t('common.reject')}
            </Button>
            <Button
              variant="primary"
              icon={<CheckIcon className="h-4 w-4" />}
              onClick={handleApprove}
            >
              {t('common.approve')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RequestDetailPage;
