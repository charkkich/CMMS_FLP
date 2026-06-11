import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export default function SparePartFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!id && id !== 'new';

  const { data: part } = useQuery({
    queryKey: ['spare_part', id],
    queryFn: async () => { const { data } = await supabase.from('spare_parts').select('*').eq('id', id).single(); return data; },
    enabled: isEdit
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ values: part || undefined });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (isEdit) { const { error } = await supabase.from('spare_parts').update(values).eq('id', id); if (error) throw error; }
      else { const { error } = await supabase.from('spare_parts').insert(values); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['spare_parts'] }); toast.success(isEdit ? 'อัปเดตสำเร็จ' : 'เพิ่มอะไหล่สำเร็จ'); navigate('/spare-parts'); },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{isEdit ? 'แก้ไขอะไหล่' : 'เพิ่มอะไหล่ใหม่'}</h1>
      <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสอะไหล่ *</label>
            <input {...register('part_code', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่ออะไหล่ *</label>
            <input {...register('name', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่</label>
            <input {...register('category')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หน่วย *</label>
            <input {...register('unit', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สต็อกปัจจุบัน</label>
            <input type="number" {...register('current_stock', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สต็อกขั้นต่ำ</label>
            <input type="number" {...register('minimum_stock', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ราคา/หน่วย</label>
            <input type="number" step="0.01" {...register('unit_cost', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={() => navigate('/spare-parts')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">ยกเลิก</button>
          <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{mutation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </form>
    </div>
  );
}
