import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Asset, Profile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

type FormValues = {
  title: string;
  description: string;
  type: 'Corrective' | 'Preventive';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  asset_id: string;
  assigned_to: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_hours: string;
  notes: string;
};

export default function WorkOrderFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isEdit = !!id && id !== 'new';

  const { data: wo } = useQuery({
    queryKey: ['work_order', id],
    queryFn: async () => { const { data } = await supabase.from('work_orders').select('*').eq('id', id).single(); return data; },
    enabled: isEdit
  });

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ['assets_select'],
    queryFn: async () => { const { data } = await supabase.from('assets').select('id,name,asset_code').eq('status', 'Active').order('name'); return (data as any[]) || []; }
  });

  const { data: technicians = [] } = useQuery<Profile[]>({
    queryKey: ['technicians'],
    queryFn: async () => { const { data } = await supabase.from('profiles').select('*').eq('role', 'technician').eq('is_active', true).order('full_name'); return (data as any[]) || []; }
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();

  useEffect(() => {
    if (wo) reset({
      ...wo,
      asset_id: wo.asset_id?.toString() || '',
      assigned_to: wo.assigned_to || '',
      estimated_hours: wo.estimated_hours?.toString() || '',
      scheduled_start: wo.scheduled_start?.split('T')[0] || '',
      scheduled_end: wo.scheduled_end?.split('T')[0] || '',
    });
  }, [wo, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        ...values,
        asset_id: values.asset_id ? parseInt(values.asset_id) : null,
        assigned_to: values.assigned_to || null,
        estimated_hours: values.estimated_hours ? parseFloat(values.estimated_hours) : null,
        scheduled_start: values.scheduled_start || null,
        scheduled_end: values.scheduled_end || null,
        status: isEdit ? wo?.status : (values.assigned_to ? 'Assigned' : 'Open'),
        created_by: user?.id,
      };
      if (isEdit) {
        const { error } = await supabase.from('work_orders').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('work_orders').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work_orders'] });
      toast.success(isEdit ? 'อัปเดตใบสั่งงานสำเร็จ' : 'สร้างใบสั่งงานสำเร็จ');
      navigate('/work-orders');
    },
    onError: (e: any) => toast.error(e.message)
  });

  const err = (field: keyof FormValues) => errors[field] && (
    <p className="mt-1 text-xs text-red-600">{errors[field]?.message || 'ต้องกรอกข้อมูล'}</p>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {isEdit ? 'แก้ไขใบสั่งงาน' : 'สร้างใบสั่งงานใหม่'}
      </h1>
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หัวข้อ *</label>
          <input {...register('title', { required: 'กรุณากรอกหัวข้อ' })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          {err('title')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ประเภท *</label>
            <select {...register('type', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="Corrective">Corrective (ซ่อมแซม)</option>
              <option value="Preventive">Preventive (ป้องกัน)</option>
            </select>
          </div>
          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ความสำคัญ *</label>
            <select {...register('priority', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รายละเอียด</label>
          <textarea {...register('description')} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Asset */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เครื่องจักร</label>
            <select {...register('asset_id')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">-- เลือกเครื่องจักร --</option>
              {assets.map((a: Asset) => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
            </select>
          </div>
          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">มอบหมายให้</label>
            <select {...register('assigned_to')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">-- ยังไม่มอบหมาย --</option>
              {technicians.map((t: Profile) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่เริ่ม</label>
            <input type="date" {...register('scheduled_start')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่สิ้นสุด</label>
            <input type="date" {...register('scheduled_end')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชั่วโมงประมาณ</label>
            <input type="number" step="0.5" min="0" {...register('estimated_hours')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ</label>
          <textarea {...register('notes')} rows={2} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/work-orders')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">ยกเลิก</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {mutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </form>
    </div>
  );
}
