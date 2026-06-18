import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { WorkOrder, SparePart, SparePartRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { PriorityBadge, WorkOrderStatusBadge } from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import {
  PencilIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  WrenchScrewdriverIcon,
  ClockIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompleteFormState {
  root_cause: string;
  corrective_action: string;
  actual_hours: string;
  labor_cost: string;
  completion_notes: string;
}

interface SparePartRequestFormState {
  part_id: string;
  quantity_requested: string;
  remark: string;
}

interface RejectFormState {
  reason: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  Open: 'เปิด',
  Assigned: 'มอบหมายแล้ว',
  'In Progress': 'กำลังดำเนินการ',
  'Waiting Spare Part': 'รออะไหล่',
  Completed: 'เสร็จสิ้น',
  Closed: 'ปิด',
  Cancelled: 'ยกเลิก',
};

const SPARE_PART_REQUEST_STATUS_LABELS: Record<string, string> = {
  Pending: 'รอดำเนินการ',
  Approved: 'อนุมัติแล้ว',
  Rejected: 'ปฏิเสธ',
  Issued: 'จ่ายแล้ว',
};

const SPARE_PART_REQUEST_STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Issued: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(val: string | null | undefined): string {
  if (!val) return '-';
  try {
    return format(parseISO(val), 'dd/MM/yyyy HH:mm');
  } catch {
    return val;
  }
}

function formatDateOnly(val: string | null | undefined): string {
  if (!val) return '-';
  try {
    return format(parseISO(val), 'dd/MM/yyyy');
  } catch {
    return val;
  }
}

// ─── Input classes ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

// ─── Modal wrapper ────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
          <XCircleIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
    </div>
  </div>
);

// ─── Section card ─────────────────────────────────────────────────────────────

const Card: React.FC<{ title?: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  icon,
  children,
  className = '',
}) => (
  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        {icon && <span className="text-gray-500 dark:text-gray-400">{icon}</span>}
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

// ─── Detail row ───────────────────────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex gap-3 py-1">
    <span className="text-xs text-gray-500 dark:text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
    <span className="text-sm text-gray-900 dark:text-white flex-1">{value || '-'}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Modal visibility states
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showSparePartModal, setShowSparePartModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Form states
  const [completeForm, setCompleteForm] = useState<CompleteFormState>({
    root_cause: '',
    corrective_action: '',
    actual_hours: '',
    labor_cost: '',
    completion_notes: '',
  });
  const [sparePartForm, setSparePartForm] = useState<SparePartRequestFormState>({
    part_id: '',
    quantity_requested: '1',
    remark: '',
  });
  const [rejectForm, setRejectForm] = useState<RejectFormState>({ reason: '' });

  // ── Role helpers ─────────────────────────────────────────────────────────────

  const role = user?.role;
  const isAdminOrSupervisor = role === 'admin' || role === 'supervisor';
  const isTechnician = role === 'technician';
  const isRequester = role === 'requester';
  const isStoreKeeper = role === 'store_keeper';

  // ── Queries ──────────────────────────────────────────────────────────────────

  const {
    data: wo,
    isLoading,
    error,
  } = useQuery<WorkOrder>({
    queryKey: ['work_order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_orders')
        .select(
          '*, asset:assets(name,asset_code,location), assignee:profiles!work_orders_assigned_to_fkey(id,full_name), creator:profiles!work_orders_created_by_fkey(full_name)'
        )
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as WorkOrder;
    },
    enabled: !!id,
  });

  const { data: sparePartRequests = [] } = useQuery<SparePartRequest[]>({
    queryKey: ['spare_part_requests', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_part_requests')
        .select('*, part:spare_parts(name,part_code,current_stock,unit), requester:profiles!requested_by(full_name)')
        .eq('wo_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SparePartRequest[];
    },
    enabled: !!id,
  });

  const { data: allSpareParts = [] } = useQuery<SparePart[]>({
    queryKey: ['spare_parts_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spare_parts')
        .select('id,part_code,name,current_stock,unit,unit_cost')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as SparePart[];
    },
    enabled: showSparePartModal,
  });

  // ── Derived state ─────────────────────────────────────────────────────────────

  const isAssignedToMe = wo?.assigned_to === user?.id;
  const isMyWorkOrder = isAssignedToMe && isTechnician;

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['work_order', id] });
    qc.invalidateQueries({ queryKey: ['work_orders'] });
    qc.invalidateQueries({ queryKey: ['spare_part_requests', id] });
    qc.invalidateQueries({ queryKey: ['dashboard-supervisor'] });
    qc.invalidateQueries({ queryKey: ['dashboard-technician'] });
  };

  // Accept work order (technician)
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'In Progress',
          actual_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('รับงานสำเร็จ เริ่มดำเนินการแล้ว');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Reject work order (technician) → back to Open, clear assigned_to
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'Open',
          assigned_to: null,
          notes: rejectForm.reason
            ? `[ปฏิเสธงาน] ${rejectForm.reason}\n\n${wo?.notes || ''}`.trim()
            : wo?.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setShowRejectModal(false);
      setRejectForm({ reason: '' });
      toast.success('ปฏิเสธงานแล้ว สถานะกลับเป็น "เปิด"');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Request spare part (technician, In Progress)
  const requestSparePartMutation = useMutation({
    mutationFn: async () => {
      if (!sparePartForm.part_id) throw new Error('กรุณาเลือกอะไหล่');
      const qty = parseInt(sparePartForm.quantity_requested, 10);
      if (!qty || qty < 1) throw new Error('จำนวนต้องมากกว่า 0');

      // Insert spare part request
      const { error: insertErr } = await supabase.from('spare_part_requests').insert({
        wo_id: parseInt(id!, 10),
        part_id: parseInt(sparePartForm.part_id, 10),
        quantity_requested: qty,
        status: 'Pending',
        requested_by: user!.id,
        remark: sparePartForm.remark || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (insertErr) throw insertErr;

      // Change WO status to Waiting Spare Part
      const { error: updateErr } = await supabase
        .from('work_orders')
        .update({ status: 'Waiting Spare Part', updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      invalidate();
      setShowSparePartModal(false);
      setSparePartForm({ part_id: '', quantity_requested: '1', remark: '' });
      toast.success('ส่งคำขออะไหล่แล้ว รอผู้ดูแลคลังอนุมัติ');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Complete work order (technician)
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!completeForm.root_cause || completeForm.root_cause.trim().length < 10)
        throw new Error('กรุณากรอกสาเหตุของปัญหา (ขั้นต่ำ 10 ตัวอักษร)');
      if (!completeForm.corrective_action || !completeForm.corrective_action.trim())
        throw new Error('กรุณากรอกการแก้ไข');
      const hrs = parseFloat(completeForm.actual_hours);
      if (!completeForm.actual_hours || isNaN(hrs) || hrs <= 0)
        throw new Error('กรุณากรอกชั่วโมงที่ใช้จริง (ต้องมากกว่า 0)');

      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'Completed',
          actual_end: new Date().toISOString(),
          root_cause: completeForm.root_cause.trim(),
          corrective_action: completeForm.corrective_action.trim(),
          actual_hours: hrs,
          labor_cost: completeForm.labor_cost ? parseFloat(completeForm.labor_cost) : null,
          completion_notes: completeForm.completion_notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setShowCompleteModal(false);
      setCompleteForm({ root_cause: '', corrective_action: '', actual_hours: '', labor_cost: '', completion_notes: '' });
      toast.success('บันทึกงานเสร็จสิ้นแล้ว รอผู้ควบคุมตรวจสอบ');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Close work order (supervisor/admin)
  const closeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: 'Closed', updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setShowCloseConfirm(false);
      toast.success('ปิดใบสั่งงานแล้ว');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Reopen work order (supervisor/admin)
  const reopenMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('work_orders')
        .update({
          status: 'In Progress',
          actual_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setShowReopenConfirm(false);
      toast.success('เปิดใบสั่งงานใหม่อีกครั้งแล้ว');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Cancel work order (admin/supervisor)
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('work_orders')
        .update({ status: 'Cancelled', updated_at: new Date().toISOString() })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_orders'] });
      toast.success('ยกเลิกใบสั่งงานแล้ว');
      navigate('/work-orders');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Loading / error states ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error || !wo) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">ไม่พบใบสั่งงาน</p>
          <button
            onClick={() => navigate('/work-orders')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            กลับรายการ
          </button>
        </div>
      </div>
    );
  }

  // ── Derived permissions ───────────────────────────────────────────────────────

  const canEdit =
    isAdminOrSupervisor && wo.status !== 'Closed' && wo.status !== 'Cancelled' && wo.status !== 'Completed';
  const canCancel =
    isAdminOrSupervisor && (wo.status === 'Open' || wo.status === 'Assigned');

  const canAccept = isTechnician && isAssignedToMe && wo.status === 'Assigned';
  const canReject = isTechnician && isAssignedToMe && wo.status === 'Assigned';
  const canRequestSparePart = isTechnician && isAssignedToMe && wo.status === 'In Progress';
  const canComplete = isTechnician && isAssignedToMe && wo.status === 'In Progress';

  const canClose = isAdminOrSupervisor && wo.status === 'Completed';
  const canReopen = isAdminOrSupervisor && wo.status === 'Completed';

  const hasAnyAction =
    canAccept || canReject || canRequestSparePart || canComplete || canClose || canReopen || canCancel;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <button
            onClick={() => navigate('/work-orders')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-0.5">{wo.wo_number}</p>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white break-words">{wo.title}</h1>
          </div>
        </div>
        {canEdit && (
          <Link
            to={`/work-orders/${id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex-shrink-0"
          >
            <PencilIcon className="h-4 w-4" />
            แก้ไข
          </Link>
        )}
      </div>

      {/* Status / Priority / Type bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-5">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">สถานะ</p>
          <WorkOrderStatusBadge status={wo.status as any} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ประเภท</p>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            {wo.type === 'Corrective' ? 'งานแก้ไข (CM)' : 'งานป้องกัน (PM)'}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ความสำคัญ</p>
          <PriorityBadge priority={wo.priority} />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ผู้รับผิดชอบ</p>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {(wo.assignee as any)?.full_name || (
              <span className="text-gray-400 italic">ยังไม่มอบหมาย</span>
            )}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ผู้สร้างงาน</p>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {(wo.creator as any)?.full_name || '-'}
          </span>
        </div>
      </div>

      {/* Waiting Spare Part notice */}
      {wo.status === 'Waiting Spare Part' && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <CubeIcon className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">รออะไหล่จากคลัง</p>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              คำขออะไหล่อยู่ระหว่างรอผู้ดูแลคลังอนุมัติและจ่าย — เมื่ออะไหล่ถูกจ่ายแล้วสถานะจะกลับเป็น "กำลังดำเนินการ" โดยอัตโนมัติ
            </p>
          </div>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Work order info */}
        <Card title="ข้อมูลงาน" icon={<WrenchScrewdriverIcon className="h-5 w-5" />}>
          <DetailRow label="เครื่องจักร / อุปกรณ์" value={(wo.asset as any)?.name} />
          <DetailRow label="รหัสเครื่อง" value={(wo.asset as any)?.asset_code} />
          <DetailRow label="สถานที่" value={(wo.asset as any)?.location} />
          <DetailRow label="รายละเอียด" value={wo.description} />
          {wo.request_id && (
            <DetailRow
              label="ใบแจ้งซ่อม #"
              value={
                <Link
                  to={`/maintenance-requests/${wo.request_id}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {wo.request_id}
                </Link>
              }
            />
          )}
          {wo.notes && <DetailRow label="หมายเหตุ" value={wo.notes} />}
          <DetailRow label="สร้างเมื่อ" value={formatDate(wo.created_at)} />
        </Card>

        {/* Schedule & cost */}
        <Card title="เวลาและค่าใช้จ่าย" icon={<ClockIcon className="h-5 w-5" />}>
          <DetailRow label="เริ่มตามแผน" value={formatDateOnly(wo.scheduled_start)} />
          <DetailRow label="สิ้นสุดตามแผน" value={formatDateOnly(wo.scheduled_end)} />
          <DetailRow label="เริ่มจริง" value={formatDate(wo.actual_start)} />
          <DetailRow label="เสร็จจริง" value={formatDate(wo.actual_end)} />
          <DetailRow
            label="ชั่วโมงประมาณ"
            value={wo.estimated_hours != null ? `${wo.estimated_hours} ชม.` : null}
          />
          <DetailRow
            label="ชั่วโมงจริง"
            value={wo.actual_hours != null ? `${wo.actual_hours} ชม.` : null}
          />
          <DetailRow
            label="ค่าแรง"
            value={wo.labor_cost != null ? `฿${wo.labor_cost.toLocaleString()}` : null}
          />
          <DetailRow
            label="ค่าอะไหล่"
            value={wo.parts_cost != null ? `฿${wo.parts_cost.toLocaleString()}` : null}
          />
        </Card>
      </div>

      {/* Completion details (only when Completed or Closed) */}
      {(wo.status === 'Completed' || wo.status === 'Closed') && (
        <Card
          title="รายละเอียดการซ่อม"
          icon={<CheckCircleIcon className="h-5 w-5 text-green-500" />}
          className="border-green-200 dark:border-green-700"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">สาเหตุของปัญหา (Root Cause)</p>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg p-3 whitespace-pre-wrap">
                {wo.root_cause || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">วิธีการแก้ไข (Corrective Action)</p>
              <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg p-3 whitespace-pre-wrap">
                {wo.corrective_action || '-'}
              </p>
            </div>
            {wo.completion_notes && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">บันทึกเพิ่มเติม</p>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 rounded-lg p-3 whitespace-pre-wrap">
                  {wo.completion_notes}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Spare part requests */}
      {sparePartRequests.length > 0 && (
        <Card title="คำขออะไหล่" icon={<CubeIcon className="h-5 w-5" />}>
          <div className="space-y-3">
            {sparePartRequests.map((req: any) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(req.part as any)?.name}
                    <span className="ml-2 text-xs text-gray-400 font-mono">{(req.part as any)?.part_code}</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    ขอ {req.quantity_requested} {(req.part as any)?.unit}
                    {req.quantity_issued != null && ` • จ่าย ${req.quantity_issued} ${(req.part as any)?.unit}`}
                    {req.remark && ` • ${req.remark}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    โดย {(req.requester as any)?.full_name} · {formatDate(req.created_at)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                    SPARE_PART_REQUEST_STATUS_COLORS[req.status] || ''
                  }`}
                >
                  {SPARE_PART_REQUEST_STATUS_LABELS[req.status] || req.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Action Panel */}
      {hasAnyAction && (
        <Card title="การดำเนินการ" className="border-blue-200 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-900/10">
          <div className="space-y-4">
            {/* Technician: Accept / Reject */}
            {(canAccept || canReject) && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  คุณได้รับมอบหมายงานนี้ — โปรดยืนยันการรับหรือปฏิเสธ
                </p>
                <div className="flex flex-wrap gap-3">
                  {canAccept && (
                    <button
                      onClick={() => acceptMutation.mutate()}
                      disabled={acceptMutation.isPending}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      {acceptMutation.isPending ? 'กำลังบันทึก...' : 'รับงาน'}
                    </button>
                  )}
                  {canReject && (
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={rejectMutation.isPending}
                      className="flex items-center gap-2 px-5 py-2.5 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-sm"
                    >
                      <XCircleIcon className="h-5 w-5" />
                      ปฏิเสธงาน
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Technician: Request spare part / Complete */}
            {(canRequestSparePart || canComplete) && (
              <div className="flex flex-wrap gap-3">
                {canRequestSparePart && (
                  <button
                    onClick={() => setShowSparePartModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 text-sm"
                  >
                    <CubeIcon className="h-5 w-5" />
                    ขออะไหล่
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={() => setShowCompleteModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    บันทึกเสร็จสิ้น
                  </button>
                )}
              </div>
            )}

            {/* Supervisor / Admin: Verify completion */}
            {(canClose || canReopen) && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  ตรวจสอบผลการซ่อมและปิดงาน หรือส่งกลับให้ดำเนินการต่อ
                </p>
                <div className="flex flex-wrap gap-3">
                  {canClose && (
                    <button
                      onClick={() => setShowCloseConfirm(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-sm"
                    >
                      <LockClosedIcon className="h-5 w-5" />
                      อนุมัติและปิดงาน
                    </button>
                  )}
                  {canReopen && (
                    <button
                      onClick={() => setShowReopenConfirm(true)}
                      className="flex items-center gap-2 px-5 py-2.5 border border-orange-400 dark:border-orange-600 text-orange-600 dark:text-orange-400 rounded-lg font-medium hover:bg-orange-50 dark:hover:bg-orange-900/20 text-sm"
                    >
                      <ArrowPathIcon className="h-5 w-5" />
                      ส่งกลับ (เปิดใหม่)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Admin / Supervisor: Cancel */}
            {canCancel && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <XCircleIcon className="h-4 w-4" />
                  ยกเลิกใบสั่งงาน
                </button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal title="ปฏิเสธงาน" onClose={() => setShowRejectModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              กรุณาระบุเหตุผลที่ปฏิเสธงาน ใบสั่งงานจะกลับเป็นสถานะ "เปิด" และล้างการมอบหมาย
            </p>
            <div>
              <label className={labelCls}>เหตุผล <span className="text-red-500">*</span></label>
              <textarea
                rows={4}
                value={rejectForm.reason}
                onChange={(e) => setRejectForm({ reason: e.target.value })}
                className={inputCls}
                placeholder="ระบุเหตุผลที่ปฏิเสธ..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || !rejectForm.reason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธ'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Request Spare Part Modal */}
      {showSparePartModal && (
        <Modal title="ขออะไหล่" onClose={() => setShowSparePartModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>อะไหล่ <span className="text-red-500">*</span></label>
              <select
                value={sparePartForm.part_id}
                onChange={(e) => setSparePartForm((f) => ({ ...f, part_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">-- เลือกอะไหล่ --</option>
                {allSpareParts.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    [{p.part_code}] {p.name} (คงเหลือ: {p.current_stock} {p.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>จำนวนที่ขอ <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="1"
                value={sparePartForm.quantity_requested}
                onChange={(e) => setSparePartForm((f) => ({ ...f, quantity_requested: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>หมายเหตุ</label>
              <textarea
                rows={3}
                value={sparePartForm.remark}
                onChange={(e) => setSparePartForm((f) => ({ ...f, remark: e.target.value }))}
                className={inputCls}
                placeholder="ระบุเหตุผล หรือรายละเอียดเพิ่มเติม..."
              />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-300">
              หลังส่งคำขอ สถานะใบสั่งงานจะเปลี่ยนเป็น "รออะไหล่" และจะกลับมา "กำลังดำเนินการ" เมื่ออะไหล่ถูกจ่ายแล้ว
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSparePartModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => requestSparePartMutation.mutate()}
                disabled={requestSparePartMutation.isPending || !sparePartForm.part_id}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {requestSparePartMutation.isPending ? 'กำลังส่ง...' : 'ส่งคำขออะไหล่'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <Modal title="บันทึกงานเสร็จสิ้น" onClose={() => setShowCompleteModal(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>
                สาเหตุของปัญหา (Root Cause) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={completeForm.root_cause}
                onChange={(e) => setCompleteForm((f) => ({ ...f, root_cause: e.target.value }))}
                className={`${inputCls} ${
                  completeForm.root_cause && completeForm.root_cause.trim().length < 10
                    ? 'border-red-400 focus:ring-red-400'
                    : ''
                }`}
                placeholder="ระบุสาเหตุที่ทำให้เกิดปัญหา (ขั้นต่ำ 10 ตัวอักษร)"
              />
              {completeForm.root_cause && completeForm.root_cause.trim().length < 10 && (
                <p className="text-xs text-red-500 mt-1">กรุณาระบุสาเหตุอย่างน้อย 10 ตัวอักษร ({completeForm.root_cause.trim().length}/10)</p>
              )}
            </div>
            <div>
              <label className={labelCls}>
                วิธีการแก้ไข (Corrective Action) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={completeForm.corrective_action}
                onChange={(e) => setCompleteForm((f) => ({ ...f, corrective_action: e.target.value }))}
                className={inputCls}
                placeholder="ระบุขั้นตอนและวิธีการแก้ไขที่ดำเนินการ"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>
                  ชั่วโมงที่ใช้จริง <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={completeForm.actual_hours}
                  onChange={(e) => setCompleteForm((f) => ({ ...f, actual_hours: e.target.value }))}
                  className={inputCls}
                  placeholder="เช่น 2.5"
                />
              </div>
              <div>
                <label className={labelCls}>ค่าแรง (฿)</label>
                <input
                  type="number"
                  min="0"
                  value={completeForm.labor_cost}
                  onChange={(e) => setCompleteForm((f) => ({ ...f, labor_cost: e.target.value }))}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>บันทึกเพิ่มเติม</label>
              <textarea
                rows={3}
                value={completeForm.completion_notes}
                onChange={(e) => setCompleteForm((f) => ({ ...f, completion_notes: e.target.value }))}
                className={inputCls}
                placeholder="หมายเหตุหรือสิ่งที่ควรระวังในอนาคต..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => completeMutation.mutate()}
                disabled={
                  completeMutation.isPending ||
                  !completeForm.root_cause.trim() ||
                  completeForm.root_cause.trim().length < 10 ||
                  !completeForm.corrective_action.trim() ||
                  !completeForm.actual_hours ||
                  parseFloat(completeForm.actual_hours) <= 0
                }
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {completeMutation.isPending ? 'กำลังบันทึก...' : 'ยืนยันเสร็จสิ้น'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showCancelConfirm}
        title="ยกเลิกใบสั่งงาน"
        message={`คุณต้องการยกเลิกใบสั่งงาน "${wo.title}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        confirmLabel="ยืนยันยกเลิก"
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setShowCancelConfirm(false)}
      />
      <ConfirmDialog
        open={showCloseConfirm}
        title="อนุมัติและปิดงาน"
        message={`คุณยืนยันที่จะปิดใบสั่งงาน "${wo.title}" หลังตรวจสอบผลการซ่อมแล้วใช่หรือไม่?`}
        confirmLabel="ปิดงาน"
        onConfirm={() => closeMutation.mutate()}
        onCancel={() => setShowCloseConfirm(false)}
      />
      <ConfirmDialog
        open={showReopenConfirm}
        title="ส่งกลับให้ดำเนินการ"
        message={`คุณต้องการส่งกลับใบสั่งงาน "${wo.title}" ให้ช่างดำเนินการต่อใช่หรือไม่? สถานะจะกลับเป็น "กำลังดำเนินการ"`}
        confirmLabel="ส่งกลับ"
        onConfirm={() => reopenMutation.mutate()}
        onCancel={() => setShowReopenConfirm(false)}
      />
    </div>
  );
}
