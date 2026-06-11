import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { StockTransaction, SparePart } from '../../types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function StockTransactionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: transactions = [] } = useQuery<StockTransaction[]>({
    queryKey: ['stock_transactions'],
    queryFn: async () => {
      const { data } = await supabase.from('stock_transactions').select('*, part:spare_parts(name,part_code)').order('transaction_date', { ascending: false });
      return (data as any[]) || [];
    }
  });

  const { data: parts = [] } = useQuery<SparePart[]>({
    queryKey: ['spare_parts_select'],
    queryFn: async () => { const { data } = await supabase.from('spare_parts').select('*').eq('is_active', true); return (data as any[]) || []; }
  });

  const { register, handleSubmit, reset } = useForm();
  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const part = parts.find((p: SparePart) => p.id === parseInt(values.part_id));
      if (!part) throw new Error('ไม่พบอะไหล่');
      const qty = parseInt(values.quantity);
      const balance = values.transaction_type === 'Receive' ? part.current_stock + qty : part.current_stock - qty;
      const { error } = await supabase.from('stock_transactions').insert({ ...values, quantity: qty, balance_after: balance, performed_by: user?.id, transaction_date: new Date().toISOString() });
      if (error) throw error;
      await supabase.from('spare_parts').update({ current_stock: balance }).eq('id', values.part_id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock_transactions'] }); qc.invalidateQueries({ queryKey: ['spare_parts'] }); toast.success('บันทึกรายการสำเร็จ'); setShowModal(false); reset(); },
    onError: (e: any) => toast.error(e.message)
  });

  const typeColor = (t: string) => ({
    Receive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Issue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Adjustment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Return: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }[t] || '');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ประวัติการเคลื่อนไหวสต็อก</h1>
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <PlusIcon className="h-4 w-4" /> บันทึกรายการ
          </button>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['วันที่','อะไหล่','ประเภท','จำนวน','คงเหลือ','อ้างอิง','หมายเหตุ'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((t: StockTransaction) => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{format(parseISO(t.transaction_date), 'dd/MM/yyyy HH:mm')}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{(t.part as any)?.name || '-'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${typeColor(t.transaction_type)}`}>{t.transaction_type}</span></td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{t.quantity}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{t.balance_after}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{t.reference_number || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{t.remark || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">บันทึกรายการสต็อก</h2>
            <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อะไหล่</label>
                <select {...register('part_id', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">-- เลือก --</option>
                  {parts.map((p: SparePart) => <option key={p.id} value={p.id}>{p.name} (คงเหลือ: {p.current_stock})</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ประเภท</label>
                <select {...register('transaction_type', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="Receive">รับเข้า (Receive)</option>
                  <option value="Issue">เบิกออก (Issue)</option>
                  <option value="Adjustment">ปรับยอด (Adjustment)</option>
                  <option value="Return">คืน (Return)</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">จำนวน</label>
                <input type="number" min="1" {...register('quantity', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเหตุ</label>
                <input {...register('remark')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">ยกเลิก</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{mutation.isPending ? '...' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
