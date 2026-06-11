import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { WorkOrder } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { PriorityBadge, WorkOrderStatusBadge } from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const VALID_TRANSITIONS: Record<string, string[]> = {
  Open:                 ['Assigned', 'In Progress', 'Cancelled'],
  Assigned:             ['In Progress', 'Cancelled'],
  'In Progress':        ['Waiting Spare Part', 'Completed', 'Cancelled'],
  'Waiting Spare Part': ['In Progress', 'Cancelled'],
  Completed:            ['Closed'],
  Closed:               [],
  Cancelled:            [],
};

const STATUS_LABELS: Record<string, string> = {
  Open: 'เปิด', Assigned: 'มอบหมายแล้ว', 'In Progress': 'กำลังดำเนินการ',
  'Waiting Spare Part': 'รออะไหล่', Completed: 'เสร็จสิ้น', Closed: 'ปิด', Cancelled: 'ยกเลิก'
};

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showComplete, setShowComplete] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [actualHours, setActualHours] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const { data: wo, isLoading } = useQuery<WorkOrder>({
    queryKey: ['work_order', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_orders').select('*, asset:assets(name,asset_code), assignee:profiles(full_name)').eq('id', id).single();
      if (error) throw error;
      return data as WorkOrder;
    }
  });

  const canEdit = user?.role === 'admin' || user?.role === 'supervisor';
  const canAct = user?.role !== 'requester';
  const canClose = user?.role === 'admin' || user?.role === 'supervisor';

  const updateStatus = useMutation({
    mutationFn: async ({ status, extra }: { status: string; extra?: Record<string, any> }) => {
      const update: Record<string, any> = { status, updated_at: new Date().toISOString(), ...extra };
      if (status === 'In Progress' && !wo?.actual_start) update.actual_start = new Date().toISOString();
      if (status === 'Completed' || status === 'Closed') update.actual_end = new Date().toISOString();
      const { error } = await supabase.from('work_orders').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work_order', id] }); qc.invalidateQueries({ queryKey: ['work_orders'] }); toast.success('อัปเดตสถานะสำเร็จ'); },
    onError: (e: any) => toast.error(e.message)
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('work_orders').update({
        status: 'Completed', actual_end: new Date().toISOString(),
        actual_hours: actualHours ? parseFloat(actualHours) : null,
        labor_cost: laborCost ? parseFloat(laborCost) : null,
        parts_cost: partsCost ? parseFloat(partsCost) : null,
        completion_notes: completionNotes || null,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work_order', id] }); qc.invalidateQueries({ queryKey: ['work_orders'] }); toast.success('บันทึกงานเสร็จสิ้นแล้ว'); setShowComplete(false); },
    onError: (e: any) => toast.error(e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('work_orders').update({ status: 'Cancelled', updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work_orders'] }); toast.success('ยกเลิกใบสั่งงานแล้ว'); navigate('/work-orders'); },
    onError: (e: any) => toast.error(e.message)
  });

  if (isLoading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>;
  if (!wo) return <div className="p-8 text-center text-gray-500">ไม่พบใบสั่งงาน</div>;

  const nextStatuses = VALID_TRANSITIONS[wo.status] || [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/work-orders')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{wo.title}</h1>
            <p className="text-sm text-gray-500">{wo.wo_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && wo.status !== 'Closed' && wo.status !== 'Cancelled' && (
            <Link to={`/work-orders/${id}/edit`} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
              <PencilIcon className="h-4 w-4" /> แก้ไข
            </Link>
          )}
          {canEdit && (wo.status === 'Open' || wo.status === 'Assigned') && (
            <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 px-3 py-2 border border-red-300 rounded-lg text-sm text-red-600 hover:bg-red-50">
              <TrashIcon className="h-4 w-4" /> ยกเลิก
            </button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 flex flex-wrap items-center gap-4">
        <div><p className="text-xs text-gray-500 mb-1">สถานะ</p><WorkOrderStatusBadge status={wo.status as any} /></div>
        <div><p className="text-xs text-gray-500 mb-1">ประเภท</p><span className="text-sm font-medium text-gray-900 dark:text-white">{wo.type}</span></div>
        <div><p className="text-xs text-gray-500 mb-1">ความสำคัญ</p><PriorityBadge priority={wo.priority} /></div>
        <div><p className="text-xs text-gray-500 mb-1">ผู้รับผิดชอบ</p><span className="text-sm text-gray-900 dark:text-white">{(wo.assignee as any)?.full_name || 'ยังไม่มอบหมาย'}</span></div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2">ข้อมูลงาน</h3>
          {[
            ['เครื่องจักร', (wo.asset as any)?.name || '-'],
            ['สถานที่', (wo.asset as any)?.asset_code || '-'],
            ['รายละเอียด', wo.description || '-'],
            ['หมายเหตุ', wo.notes || '-'],
            ['วันที่สร้าง', format(parseISO(wo.created_at), 'dd/MM/yyyy HH:mm')],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-2"><span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span><span className="text-sm text-gray-900 dark:text-white">{val}</span></div>
          ))}
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white border-b pb-2">เวลาและค่าใช้จ่าย</h3>
          {[
            ['เริ่มตาม schedule', wo.scheduled_start ? format(parseISO(wo.scheduled_start), 'dd/MM/yyyy') : '-'],
            ['สิ้นสุดตาม schedule', wo.scheduled_end ? format(parseISO(wo.scheduled_end), 'dd/MM/yyyy') : '-'],
            ['เริ่มจริง', wo.actual_start ? format(parseISO(wo.actual_start), 'dd/MM/yyyy HH:mm') : '-'],
            ['เสร็จจริง', wo.actual_end ? format(parseISO(wo.actual_end), 'dd/MM/yyyy HH:mm') : '-'],
            ['ชั่วโมงประมาณ', wo.estimated_hours ? `${wo.estimated_hours} ชม.` : '-'],
            ['ชั่วโมงจริง', wo.actual_hours ? `${wo.actual_hours} ชม.` : '-'],
            ['ค่าแรง', wo.labor_cost ? `฿${wo.labor_cost.toLocaleString()}` : '-'],
            ['ค่าอะไหล่', wo.parts_cost ? `฿${wo.parts_cost.toLocaleString()}` : '-'],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-2"><span className="text-xs text-gray-500 w-32 flex-shrink-0">{label}</span><span className="text-sm text-gray-900 dark:text-white">{val}</span></div>
          ))}
        </div>
      </div>

      {wo.completion_notes && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200">
          <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">บันทึกการเสร็จสิ้น</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{wo.completion_notes}</p>
        </div>
      )}

      {/* Action Buttons */}
      {canAct && nextStatuses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">การดำเนินการ</h3>
          <div className="flex flex-wrap gap-3">
            {nextStatuses.filter(s => s !== 'Completed' && (s !== 'Closed' || canClose)).map(status => (
              <button
                key={status}
                onClick={() => updateStatus.mutate({ status })}
                disabled={updateStatus.isPending}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                → {STATUS_LABELS[status] || status}
              </button>
            ))}
            {nextStatuses.includes('Completed') && (
              <button onClick={() => setShowComplete(true)} className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700">
                ✓ บันทึกเสร็จสิ้น
              </button>
            )}
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showComplete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">บันทึกการเสร็จสิ้นงาน</h2>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชั่วโมงที่ใช้จริง</label>
                <input type="number" step="0.5" min="0" value={actualHours} onChange={e => setActualHours(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ค่าแรง (฿)</label>
                <input type="number" min="0" value={laborCost} onChange={e => setLaborCost(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ค่าอะไหล่ (฿)</label>
                <input type="number" min="0" value={partsCost} onChange={e => setPartsCost(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">บันทึกการทำงาน *</label>
              <textarea rows={3} value={completionNotes} onChange={e => setCompletionNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="สรุปสิ่งที่ทำ ชิ้นส่วนที่เปลี่ยน..." /></div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowComplete(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">ยกเลิก</button>
              <button onClick={() => completeMutation.mutate()} disabled={completeMutation.isPending || !completionNotes} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {completeMutation.isPending ? '...' : 'ยืนยันเสร็จสิ้น'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="ยกเลิกใบสั่งงาน"
        message={`คุณต้องการยกเลิกใบสั่งงาน "${wo.title}" ใช่หรือไม่?`}
        confirmLabel="ยกเลิกใบสั่งงาน"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
