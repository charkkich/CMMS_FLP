import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { PlusIcon, EyeIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import { PriorityBadge, RequestStatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { MaintenanceRequest } from '../../types';
import { format } from 'date-fns';

const RequestListPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 10;

  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [rejectModal, setRejectModal] = useState<{ open: boolean; request: MaintenanceRequest | null }>({ open: false, request: null });
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: PAGE_SIZE };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (search) params.search = search;
      const res = await api.get('/requests', { params });
      const data = res.data;
      if (Array.isArray(data)) {
        setRequests(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setRequests(data.data || data.requests || []);
        setTotal(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / PAGE_SIZE));
      }
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterPriority, filterDateFrom, filterDateTo, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const canApproveReject = user?.role === 'admin' || user?.role === 'supervisor';
  const canCreate = user?.role !== 'technician';

  const handleApprove = async (req: MaintenanceRequest) => {
    setActionLoading(true);
    try {
      await api.patch(`/requests/${req.id}/approve`);
      toast.success('Request approved');
      fetchRequests();
    } catch {
      toast.error('Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.request) return;
    setActionLoading(true);
    try {
      await api.patch(`/requests/${rejectModal.request.id}/reject`, { rejection_reason: rejectReason });
      toast.success('Request rejected');
      setRejectModal({ open: false, request: null });
      setRejectReason('');
      fetchRequests();
    } catch {
      toast.error('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('request.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} total records</p>
        </div>
        {canCreate && (
          <Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/requests/new')}>
            {t('request.createNew')}
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input type="text" placeholder={t('common.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Status</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Converted to Work Order">Converted to WO</option>
          </select>
          <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="">All Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Request #', 'Date', 'Requester', 'Department', 'Asset', 'Priority', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>)}</tr>
              )) : requests.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">{t('common.noData')}</td></tr>
              ) : requests.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-primary-600 dark:text-primary-400">{req.request_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{req.created_at ? format(new Date(req.created_at), 'dd/MM/yyyy') : '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{(req.requester as any)?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{req.location || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{(req.asset as any)?.name || '-'}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={req.priority} /></td>
                  <td className="px-4 py-3"><RequestStatusBadge status={req.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => navigate(`/requests/${req.id}`)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors" title="View"><EyeIcon className="h-4 w-4" /></button>
                      {canApproveReject && req.status === 'Submitted' && (
                        <>
                          <button onClick={() => handleApprove(req)} disabled={actionLoading} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="Approve"><CheckIcon className="h-4 w-4" /></button>
                          <button onClick={() => setRejectModal({ open: true, request: req })} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Reject"><XMarkIcon className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700">Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={rejectModal.open} onClose={() => setRejectModal({ open: false, request: null })} title="Reject Request"
        footer={<><Button variant="secondary" onClick={() => setRejectModal({ open: false, request: null })}>{t('common.cancel')}</Button><Button variant="danger" loading={actionLoading} onClick={handleReject}>{t('common.reject')}</Button></>}>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Reject request <strong>{rejectModal.request?.request_number}</strong>?</p>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rejection Reason</label>
          <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Enter reason..." />
        </div>
      </Modal>
    </div>
  );
};

export default RequestListPage;
