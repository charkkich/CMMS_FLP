import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon, CheckCircleIcon, XCircleIcon, WrenchScrewdriverIcon,
  ExclamationTriangleIcon, PhotoIcon, CalendarDaysIcon, UserIcon,
  BuildingOfficeIcon, TagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_CLS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600',
};

const STATUS_CLS: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
  Approved: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  'In Progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
  Cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600',
};

const PRIORITY_LABEL: Record<string, string> = {
  Critical: 'วิกฤต',
  High: 'สูง',
  Medium: 'ปานกลาง',
  Low: 'ต่ำ',
};

const STATUS_LABEL: Record<string, string> = {
  Submitted: 'ยื่นคำขอแล้ว',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ปฏิเสธ',
  'In Progress': 'กำลังดำเนินการ',
  Completed: 'เสร็จสิ้น',
  Cancelled: 'ยกเลิก',
};

// ─── Component ────────────────────────────────────────────────────────────────

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [rejectModal, setRejectModal] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Fetch request details
  const { data: req, isLoading, error } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          requester:profiles!requester_id(full_name, email),
          approver:profiles!approved_by(full_name),
          asset:assets(name, asset_code, location)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  // Fetch linked work order (if any) — re-keyed on req.status so it refetches after approval
  const { data: linkedWO } = useQuery({
    queryKey: ['request-wo', id, req?.status],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_orders')
        .select('id, wo_number, status, priority, assigned_to, scheduled_end')
        .eq('request_id', id!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!id,
  });

  const canApprove = user?.role === 'admin' || user?.role === 'supervisor';

  // ── Approve + auto-create Work Order ──────────────────────────────────────
  const approve = async () => {
    if (!req || saving) return;
    setSaving(true);
    try {
      // Check if WO already exists for this request
      const { data: existingWO } = await supabase
        .from('work_orders')
        .select('id, wo_number')
        .eq('request_id', Number(id!))
        .single();

      if (!existingWO) {
        // Auto-create Work Order
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const seq = String(Math.floor(Math.random() * 9000) + 1000);
        const woNumber = `WO-${yyyy}${mm}-${seq}`;
        const { error: woError } = await supabase.from('work_orders').insert({
          wo_number: woNumber,
          title: req.title,
          description: req.description || null,
          type: 'Corrective',
          priority: req.priority,
          status: 'Open',
          asset_id: req.asset_id || null,
          request_id: Number(id!),
          created_by: user?.id,
          root_cause: null,
          corrective_action: null,
          notes: null,
          completion_notes: null,
        });
        if (woError) throw woError;
      }

      const { error } = await supabase
        .from('maintenance_requests')
        .update({ status: 'Approved', approved_by: user?.id, updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (error) throw error;

      toast.success('อนุมัติแล้ว — สร้างใบสั่งงานอัตโนมัติ');
      qc.invalidateQueries({ queryKey: ['request', id] });
      qc.invalidateQueries({ queryKey: ['work_orders'] });
      qc.invalidateQueries({ queryKey: ['requests'] });
    } catch (err: any) {
      toast.error(err.message || 'เกิดข้อผิดพลาด');
    } finally { setSaving(false); }
  };

  // ── Reject ────────────────────────────────────────────────────────────────
  const reject = async () => {
    if (!reason.trim()) { toast.error('กรุณาระบุเหตุผลการปฏิเสธ'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'Rejected', rejection_reason: reason.trim() })
      .eq('id', id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('ปฏิเสธคำขอแล้ว');
    setRejectModal(false);
    setReason('');
    qc.invalidateQueries({ queryKey: ['request', id] });
  };

  // ── Loading / Error states ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !req) {
    return (
      <div className="text-center py-24">
        <ExclamationTriangleIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">ไม่พบข้อมูลคำขอ</p>
        <button onClick={() => navigate('/requests')} className="mt-4 text-sm text-primary-600 hover:underline">
          กลับไปยังรายการ
        </button>
      </div>
    );
  }

  const photos: string[] = Array.isArray(req.photo_urls)
    ? req.photo_urls
    : req.photo_url
    ? [req.photo_url]
    : [];

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/requests')}
          className="mt-1 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{req.title}</h1>
          <p className="text-sm text-gray-500 font-mono mt-0.5">{req.request_number || `#${req.id?.slice(0, 8)}`}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PRIORITY_CLS[req.priority] || 'bg-gray-100 text-gray-600'}`}>
            {PRIORITY_LABEL[req.priority] || req.priority}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[req.status] || 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[req.status] || req.status}
          </span>
        </div>
      </div>

      {/* ── Linked Work Order banner ── */}
      {linkedWO && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800">
          <WrenchScrewdriverIcon className="h-5 w-5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-teal-800 dark:text-teal-300">มีใบสั่งงานที่เชื่อมโยง</p>
            <p className="text-xs text-teal-600 dark:text-teal-400 mt-0.5">
              {linkedWO.wo_number} — สถานะ: <span className={`font-medium ${STATUS_CLS[linkedWO.status] ? '' : ''}`}>{linkedWO.status}</span>
            </p>
          </div>
          <Link
            to={`/work-orders/${linkedWO.id}`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors whitespace-nowrap"
          >
            <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
            ดูใบสั่งงาน
          </Link>
        </div>
      )}

      {/* ── Rejection reason banner ── */}
      {req.status === 'Rejected' && req.rejection_reason && (
        <div className="flex gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <XCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">เหตุผลการปฏิเสธ</p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">{req.rejection_reason}</p>
          </div>
        </div>
      )}

      {/* ── Request Details ── */}
      <Card title="รายละเอียดคำขอ">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
          {/* Requester */}
          <div className="flex gap-3">
            <UserIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ผู้ยื่นคำขอ</dt>
              <dd className="mt-1 text-gray-900 dark:text-white font-medium">{req.requester?.full_name || '—'}</dd>
              {req.requester?.email && <dd className="text-xs text-gray-500">{req.requester.email}</dd>}
            </div>
          </div>

          {/* Submitted date */}
          <div className="flex gap-3">
            <CalendarDaysIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">วันที่ยื่น</dt>
              <dd className="mt-1 text-gray-900 dark:text-white">{req.created_at ? format(parseISO(req.created_at), 'd MMMM yyyy HH:mm', { locale: th }) : '—'}</dd>
            </div>
          </div>

          {/* Asset */}
          <div className="flex gap-3">
            <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">เครื่องจักร / อุปกรณ์</dt>
              <dd className="mt-1 text-gray-900 dark:text-white">{req.asset?.name || '—'}</dd>
              {req.asset?.asset_code && <dd className="text-xs text-gray-500">รหัส: {req.asset.asset_code}</dd>}
            </div>
          </div>

          {/* Location */}
          <div className="flex gap-3">
            <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">สถานที่</dt>
              <dd className="mt-1 text-gray-900 dark:text-white">{req.location || req.asset?.location || '—'}</dd>
            </div>
          </div>

          {/* Category */}
          {req.category && (
            <div className="flex gap-3">
              <TagIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ประเภทงาน</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{req.category}</dd>
              </div>
            </div>
          )}

          {/* Approver */}
          {req.approver?.full_name && (
            <div className="flex gap-3">
              <CheckCircleIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">อนุมัติโดย</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{req.approver.full_name}</dd>
              </div>
            </div>
          )}

          {/* Description — full width */}
          {req.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">รายละเอียด</dt>
              <dd className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                {req.description}
              </dd>
            </div>
          )}
        </div>
      </Card>

      {/* ── Photo Attachments ── */}
      {photos.length > 0 && (
        <Card title={`รูปภาพแนบ (${photos.length} รูป)`}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((url: string, i: number) => (
              <button
                key={i}
                onClick={() => setLightboxImg(url)}
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-primary-500 transition-all group"
              >
                <img
                  src={url}
                  alt={`ภาพที่ ${i + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = ''; (e.currentTarget.parentElement as HTMLElement).classList.add('bg-gray-100', 'dark:bg-gray-700'); }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <PhotoIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ── Action Buttons (Supervisor/Admin only, Submitted status) ── */}
      {canApprove && req.status === 'Submitted' && (
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            icon={<CheckCircleIcon className="h-4 w-4" />}
            loading={saving}
            onClick={approve}
          >
            อนุมัติ &amp; สร้างใบสั่งงาน
          </Button>
          <Button
            variant="danger"
            icon={<XCircleIcon className="h-4 w-4" />}
            onClick={() => setRejectModal(true)}
            disabled={saving}
          >
            ปฏิเสธ
          </Button>
        </div>
      )}

      {/* ── Reject Modal ── */}
      <Modal
        isOpen={rejectModal}
        onClose={() => { setRejectModal(false); setReason(''); }}
        title="ปฏิเสธคำขอซ่อมบำรุง"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setRejectModal(false); setReason(''); }}>ยกเลิก</Button>
            <Button variant="danger" loading={saving} onClick={reject} disabled={!reason.trim()}>
              ยืนยันการปฏิเสธ
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
            <strong>คำเตือน:</strong> การปฏิเสธจะไม่สามารถยกเลิกได้ กรุณาระบุเหตุผลที่ชัดเจน
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              เหตุผลการปฏิเสธ <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="ระบุเหตุผลที่ปฏิเสธคำขอนี้..."
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-400">{reason.length} ตัวอักษร</p>
          </div>
        </div>
      </Modal>

      {/* ── Image Lightbox ── */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="ดูภาพขนาดใหญ่"
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RequestDetailPage;
