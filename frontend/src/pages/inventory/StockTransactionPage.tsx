import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { StockTransaction, SparePart } from '../../types';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PlusIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function StockTransactionPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  const isTechnician = user?.role === 'technician';
  const isStoreOrAbove = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'store_keeper';
  const canIssue = isTechnician || isStoreOrAbove;

  const { data: transactions = [] } = useQuery<StockTransaction[]>({
    queryKey: ['stock_transactions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_transactions')
        .select('*, part:spare_parts(name,part_code)')
        .order('transaction_date', { ascending: false });
      return (data as any[]) || [];
    },
  });

  const { data: parts = [] } = useQuery<SparePart[]>({
    queryKey: ['spare_parts_select'],
    queryFn: async () => {
      const { data } = await supabase.from('spare_parts').select('*').eq('is_active', true);
      return (data as any[]) || [];
    },
  });

  const { register, handleSubmit, reset, watch } = useForm<any>({
    defaultValues: { transaction_type: isTechnician ? 'Issue' : 'Receive' },
  });
  const selectedType = watch('transaction_type');

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const part = parts.find((p: SparePart) => p.id === parseInt(values.part_id));
      if (!part) throw new Error('ไม่พบอะไหล่');
      const qty = parseInt(values.quantity);
      if (qty <= 0) throw new Error('จำนวนต้องมากกว่า 0');

      const isOut = values.transaction_type === 'Issue';
      const isIn  = values.transaction_type === 'Receive' || values.transaction_type === 'Return';
      const balance = isIn ? part.current_stock + qty : part.current_stock - qty;

      if (balance < 0) throw new Error(`สต็อกไม่เพียงพอ (คงเหลือ: ${part.current_stock} ${part.unit})`);

      const txPayload: any = {
        part_id: parseInt(values.part_id),
        transaction_type: values.transaction_type,
        quantity: qty,
        balance_after: balance,
        reference_number: values.reference_number || null,
        wo_id: values.wo_id ? parseInt(values.wo_id) : null,
        remark: values.remark || null,
        performed_by: user?.id,
        transaction_date: new Date().toISOString(),
      };

      const { error } = await supabase.from('stock_transactions').insert(txPayload);
      if (error) throw error;
      await supabase.from('spare_parts').update({ current_stock: balance }).eq('id', values.part_id);

      if (balance <= part.minimum_stock && part.minimum_stock > 0) {
        toast.error(`⚠️ ${part.name} สต็อกต่ำกว่าขั้นต่ำ (${balance}/${part.minimum_stock})`, { duration: 5000 });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock_transactions'] });
      qc.invalidateQueries({ queryKey: ['spare_parts'] });
      qc.invalidateQueries({ queryKey: ['spare_parts_select'] });
      qc.invalidateQueries({ queryKey: ['dashboard-storekeeper'] });
      qc.invalidateQueries({ queryKey: ['dashboard-supervisor'] });
      toast.success('บันทึกรายการสำเร็จ');
      setShowModal(false);
      reset({ transaction_type: isTechnician ? 'Issue' : 'Receive' });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const typeColor = (t: string) => ({
    Receive:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Issue:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Adjustment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Return:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }[t] || '');

  const typeLabel = (t: string) => ({ Receive: 'รับเข้า', Issue: 'เบิกออก', Adjustment: 'ปรับยอด', Return: 'คืน' }[t] || t);

  const filtered = transactions
    .filter((t: any) => !filterType || t.transaction_type === filterType)
    .filter((t: any) => {
      if (!search) return true;
      const name = t.part?.name?.toLowerCase() || '';
      const code = t.part?.part_code?.toLowerCase() || '';
      const ref  = t.reference_number?.toLowerCase() || '';
      return name.includes(search.toLowerCase()) || code.includes(search.toLowerCase()) || ref.includes(search.toLowerCase());
    });

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">การเคลื่อนไหวสต็อก</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">รับเข้า · เบิกออก · ปรับยอด</p>
        </div>
        {canIssue && (
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white shadow transition-colors ${
              isTechnician
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <PlusIcon className="h-4 w-4" />
            {isTechnician ? '🔧 เบิกอะไหล่' : 'บันทึกรายการ'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาอะไหล่ หรือเลขอ้างอิง..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="">ทุกประเภท</option>
          <option value="Receive">รับเข้า</option>
          <option value="Issue">เบิกออก</option>
          <option value="Adjustment">ปรับยอด</option>
          <option value="Return">คืน</option>
        </select>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {['Receive', 'Issue', 'Adjustment', 'Return'].map(type => {
          const count = transactions.filter((t: any) => t.transaction_type === type).length;
          return (
            <span key={type} className={`px-3 py-1 text-xs rounded-full font-medium ${typeColor(type)}`}>
              {typeLabel(type)}: {count} รายการ
            </span>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {['วันที่-เวลา', 'อะไหล่', 'ประเภท', 'จำนวน', 'คงเหลือ', 'อ้างอิง / WO', 'หมายเหตุ'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">ไม่มีรายการ</td></tr>
            ) : filtered.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {format(parseISO(t.transaction_date), 'dd/MM/yy HH:mm')}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.part?.name || '-'}</p>
                  <p className="text-xs text-gray-400 font-mono">{t.part?.part_code}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${typeColor(t.transaction_type)}`}>
                    {typeLabel(t.transaction_type)}
                  </span>
                </td>
                <td className={`px-4 py-3 text-sm font-bold ${
                  t.transaction_type === 'Issue' ? 'text-red-600 dark:text-red-400' :
                  t.transaction_type === 'Receive' || t.transaction_type === 'Return' ? 'text-green-600 dark:text-green-400' :
                  'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {t.transaction_type === 'Issue' ? '−' : t.transaction_type === 'Receive' || t.transaction_type === 'Return' ? '+' : '±'}
                  {Math.abs(t.quantity)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{t.balance_after}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">{t.reference_number || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{t.remark || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── MODAL ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isTechnician ? '🔧 เบิกอะไหล่' : 'บันทึกรายการสต็อก'}
              </h2>
              <button onClick={() => { setShowModal(false); reset({ transaction_type: isTechnician ? 'Issue' : 'Receive' }); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="p-6 space-y-4">
              <input type="hidden" {...register('transaction_type')} />

              {/* Part selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  อะไหล่ <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('part_id', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">-- เลือกอะไหล่ --</option>
                  {parts.map((p: SparePart) => (
                    <option key={p.id} value={p.id}>
                      {p.part_code} · {p.name} (คงเหลือ: {p.current_stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction type — technicians only see Issue */}
              {!isTechnician && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ประเภท <span className="text-red-500">*</span></label>
                  <select
                    {...register('transaction_type', { required: true })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="Receive">รับเข้า (Receive)</option>
                    <option value="Issue">เบิกออก (Issue)</option>
                    <option value="Adjustment">ปรับยอด (Adjustment)</option>
                    <option value="Return">คืน (Return)</option>
                  </select>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  จำนวน <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" min="1"
                  {...register('quantity', { required: true })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Reference (optional for technician, labeled differently) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isTechnician ? 'เลขใบสั่งงาน (ถ้ามี)' : 'เลขอ้างอิง / เลข PO'}
                </label>
                <input
                  {...register('reference_number')}
                  placeholder={isTechnician ? 'WO-XXXXXX-XXXX (ไม่บังคับ)' : 'PO-2024-XXXX'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {isTechnician ? 'วัตถุประสงค์การใช้งาน *' : 'หมายเหตุ'}
                </label>
                <textarea
                  rows={2}
                  {...register('remark', isTechnician ? { required: 'กรุณาระบุวัตถุประสงค์' } : {})}
                  placeholder={isTechnician ? 'เช่น ซ่อมมอเตอร์ EVAP โรงเรือน 5 เปลี่ยนลูกปืน...' : ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                />
                {isTechnician && (
                  <p className="text-xs text-gray-400 mt-1">ช่างต้องระบุวัตถุประสงค์การใช้งานทุกครั้ง</p>
                )}
              </div>

              {/* Warning for technician */}
              {isTechnician && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-semibold">⚠️ หมายเหตุสำหรับช่าง</p>
                  <p>การเบิกอะไหล่ตรงจะถูกบันทึกในระบบและรายงานต่อหัวหน้า กรุณาใช้เฉพาะงานที่จำเป็น</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); reset({ transaction_type: isTechnician ? 'Issue' : 'Receive' }); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {mutation.isPending ? 'กำลังบันทึก...' : isTechnician ? 'ยืนยันเบิกอะไหล่' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
