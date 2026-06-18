import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type FilterTab = 'all' | 'Pending' | 'Issued' | 'Rejected';

interface SparePartRequest {
  id: number;
  created_at: string;
  updated_at: string;
  quantity_requested: number;
  quantity_issued: number | null;
  status: 'Pending' | 'Issued' | 'Approved' | 'Rejected';
  rejection_reason: string | null;
  wo_id: number;
  part_id: number;
  requested_by: string;
  approved_by: string | null;
  remark: string | null;
  work_order: { id: number; wo_number: string | null } | null;
  part: { name: string; part_code: string; current_stock: number; unit: string } | null;
  requester: { full_name: string } | null;
}

const fetchRequests = async (): Promise<SparePartRequest[]> => {
  const { data, error } = await supabase
    .from('spare_part_requests')
    .select(
      `id, created_at, updated_at, quantity_requested, quantity_issued, status,
       rejection_reason, wo_id, part_id, requested_by, approved_by, remark,
       work_order:work_orders!wo_id(id, wo_number),
       part:spare_parts!part_id(name, part_code, current_stock, unit),
       requester:profiles!requested_by(full_name)`
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SparePartRequest[];
};

const StatusBadge: React.FC<{ status: SparePartRequest['status'] }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    Pending:  { label: 'รอดำเนินการ', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
    Issued:   { label: 'อนุมัติแล้ว', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    Approved: { label: 'อนุมัติแล้ว', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    Rejected: { label: 'ปฏิเสธแล้ว', cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
};

const SparePartApprovalPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<FilterTab>('Pending');
  const [rejectTarget, setRejectTarget] = useState<SparePartRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [search, setSearch] = useState('');

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['spare-part-requests'],
    queryFn: fetchRequests,
  });

  const today = new Date().toISOString().slice(0, 10);
  const pendingCount  = allRequests.filter((r: any) => r.status === 'Pending').length;
  const approvedToday = allRequests.filter(
    (r: any) => (r.status === 'Issued' || r.status === 'Approved') && r.updated_at?.slice(0, 10) === today
  ).length;
  const rejectedToday = allRequests.filter(
    (r: any) => r.status === 'Rejected' && r.updated_at?.slice(0, 10) === today
  ).length;

  const approveMutation = useMutation({
    mutationFn: async (req: SparePartRequest) => {
      const part = req.part;
      if (!part) throw new Error('ไม่พบข้อมูลอะไหล่');
      if (part.current_stock < req.quantity_requested) {
        throw new Error('สต็อกไม่เพียงพอ');
      }

      const newStock = Math.max(0, part.current_stock - req.quantity_requested);

      // 1. Update spare_part_requests
      const { error: e1 } = await supabase
        .from('spare_part_requests')
        .update({
          status: 'Issued',
          approved_by: user!.id,
          quantity_issued: req.quantity_requested,
        })
        .eq('id', req.id);
      if (e1) throw e1;

      // 2. Update spare_parts current_stock
      const { error: e2 } = await supabase
        .from('spare_parts')
        .update({ current_stock: newStock })
        .eq('id', req.part_id);
      if (e2) throw e2;

      // 3. Insert stock_transaction
      const { error: e3 } = await supabase
        .from('stock_transactions')
        .insert({
          part_id: req.part_id,
          transaction_type: 'Issue',
          quantity: req.quantity_requested,
          balance_after: newStock,
          reference_number: req.work_order?.wo_number ?? null,
          wo_id: req.wo_id,
          spare_part_request_id: req.id,
          performed_by: user!.id,
          remark: 'Issued for WO',
          transaction_date: new Date().toISOString(),
        });
      if (e3) throw e3;

      // 4. Update work_order status back to In Progress (only if currently Waiting Spare Part)
      if (req.wo_id) {
        const { error: e4 } = await supabase
          .from('work_orders')
          .update({ status: 'In Progress' })
          .eq('id', req.wo_id)
          .eq('status', 'Waiting Spare Part');
        if (e4) throw e4;
      }
    },
    onSuccess: () => {
      toast.success('อนุมัติใบเบิกอะไหล่เรียบร้อย');
      queryClient.invalidateQueries({ queryKey: ['spare-part-requests'] });
      queryClient.invalidateQueries({ queryKey: ['spare_parts'] });
      queryClient.invalidateQueries({ queryKey: ['stock_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-storekeeper'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-supervisor'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ req, reason }: { req: SparePartRequest; reason: string }) => {
      // 1. Update spare_part_requests
      const { error: e1 } = await supabase
        .from('spare_part_requests')
        .update({ status: 'Rejected', rejection_reason: reason })
        .eq('id', req.id);
      if (e1) throw e1;

      // 2. Update work_order status back to In Progress
      if (req.wo_id) {
        const { error: e2 } = await supabase
          .from('work_orders')
          .update({ status: 'In Progress' })
          .eq('id', req.wo_id)
          .eq('status', 'Waiting Spare Part');
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success('ปฏิเสธใบเบิกอะไหล่เรียบร้อย');
      setRejectTarget(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['spare-part-requests'] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['work_orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-storekeeper'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    },
  });

  const handleApprove = (req: SparePartRequest) => {
    approveMutation.mutate(req);
  };

  const handleOpenReject = (req: SparePartRequest) => {
    setRejectTarget(req);
    setRejectionReason('');
    setReasonError('');
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) {
      setReasonError('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }
    if (!rejectTarget) return;
    rejectMutation.mutate({ req: rejectTarget, reason: rejectionReason.trim() });
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',      label: 'ทั้งหมด' },
    { key: 'Pending',  label: 'รอดำเนินการ' },
    { key: 'Issued',   label: 'อนุมัติแล้ว' },
    { key: 'Rejected', label: 'ปฏิเสธแล้ว' },
  ];

  const tabFiltered = activeTab === 'all'
    ? allRequests
    : allRequests.filter((r: any) => {
        if (activeTab === 'Issued') return r.status === 'Issued' || r.status === 'Approved';
        return r.status === activeTab;
      });

  const filtered = tabFiltered.filter((r: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.part?.name?.toLowerCase().includes(q) ||
      r.part?.part_code?.toLowerCase().includes(q) ||
      r.work_order?.wo_number?.toLowerCase().includes(q) ||
      r.requester?.full_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <ShoppingCartIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">อนุมัติใบเบิกอะไหล่</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            จัดการคำขอเบิกอะไหล่จากใบสั่งงาน
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex-shrink-0">
            <ClockIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">รอดำเนินการ</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex-shrink-0">
            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">อนุมัติวันนี้</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{approvedToday}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex-shrink-0">
            <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">ปฏิเสธวันนี้</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{rejectedToday}</p>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        {/* Tabs + Search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4">
          <div className="flex gap-0 border-b border-transparent">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
                {tab.key === 'Pending' && pendingCount > 0 && (
                  <span className="ml-1.5 bg-yellow-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5 leading-none">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative mb-2">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาอะไหล่ / ใบสั่งงาน..."
              className="pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                {['วันที่', 'ใบสั่งงาน', 'ชื่ออะไหล่', 'จำนวนที่ขอ', 'สต็อกปัจจุบัน', 'ผู้ขอ', 'สถานะ', 'การดำเนินการ'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500 dark:text-gray-400">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                filtered.map((req: any) => {
                  const stockOk = (req.part?.current_stock ?? 0) >= req.quantity_requested;
                  return (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {new Date(req.created_at).toLocaleDateString('th-TH', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                          {req.work_order?.wo_number ?? `WO-${req.wo_id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        <div className="font-medium">{req.part?.name ?? '-'}</div>
                        <div className="text-xs text-gray-400">{req.part?.part_code}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-center whitespace-nowrap">
                        {req.quantity_requested}
                        <span className="ml-1 text-xs text-gray-400">{req.part?.unit ?? ''}</span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`font-semibold ${stockOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {req.part?.current_stock ?? 0}
                        </span>
                        <span className="ml-1 text-xs text-gray-400">{req.part?.unit ?? ''}</span>
                        {!stockOk && req.status === 'Pending' && (
                          <span className="ml-1 text-xs text-red-500">(ไม่พอ)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {req.requester?.full_name ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={req.status} />
                        {req.status === 'Rejected' && req.rejection_reason && (
                          <p className="text-xs text-gray-400 mt-1 max-w-xs truncate" title={req.rejection_reason}>
                            {req.rejection_reason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {req.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(req)}
                              disabled={approveMutation.isPending}
                              title={!stockOk ? 'สต็อกไม่เพียงพอ' : 'อนุมัติ'}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                stockOk
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                              อนุมัติ
                            </button>
                            <button
                              onClick={() => handleOpenReject(req)}
                              disabled={rejectMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 transition-colors"
                            >
                              <XCircleIcon className="w-4 h-4" />
                              ปฏิเสธ
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex-shrink-0">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ปฏิเสธใบเบิกอะไหล่</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {rejectTarget.part?.name} — {rejectTarget.quantity_requested} {rejectTarget.part?.unit}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <p><span className="font-medium">ผู้ขอ:</span> {rejectTarget.requester?.full_name ?? '-'}</p>
              <p><span className="font-medium">ใบสั่งงาน:</span> {rejectTarget.work_order?.wo_number ?? `WO-${rejectTarget.wo_id}`}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={e => { setRejectionReason(e.target.value); setReasonError(''); }}
                placeholder="ระบุเหตุผล..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              {reasonError && (
                <p className="text-xs text-red-500 mt-1">{reasonError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => { setRejectTarget(null); setRejectionReason(''); setReasonError(''); }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejectMutation.isPending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SparePartApprovalPage;
