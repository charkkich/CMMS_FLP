import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { SparePart } from '../../types';
import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

export default function SparePartListPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const { data: parts = [], isLoading } = useQuery<SparePart[]>({
    queryKey: ['spare_parts'],
    queryFn: async () => {
      const { data } = await supabase.from('spare_parts').select('*').eq('is_active', true).order('name');
      return (data as any[]) || [];
    }
  });

  const lowStock = parts.filter((p: SparePart) => p.minimum_stock > 0 && p.current_stock <= p.minimum_stock);
  const filtered = parts.filter((p: SparePart) => p.name.toLowerCase().includes(search.toLowerCase()) || p.part_code.toLowerCase().includes(search.toLowerCase()));

  const canEdit = user?.role === 'admin' || user?.role === 'supervisor';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">อะไหล่และสต็อก</h1>
        {canEdit && (
          <Link to="/spare-parts/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <PlusIcon className="h-4 w-4" /> เพิ่มอะไหล่
          </Link>
        )}
      </div>
      {lowStock.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-400">
            มี <strong>{lowStock.length}</strong> รายการที่สต็อกต่ำกว่าขั้นต่ำ: {lowStock.map((p: SparePart) => p.name).join(', ')}
          </p>
        </div>
      )}
      <div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาอะไหล่..." className="w-full max-w-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
      </div>
      {isLoading ? <div className="text-center py-8 text-gray-500">กำลังโหลด...</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['รหัส','ชื่ออะไหล่','หมวดหมู่','สต็อกปัจจุบัน','สต็อกขั้นต่ำ','หน่วย','ราคา/หน่วย','สถานะ',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((part: SparePart) => {
                const isLow = part.minimum_stock > 0 && part.current_stock <= part.minimum_stock;
                return (
                  <tr key={part.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">{part.part_code}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{part.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{part.category || '-'}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${isLow ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{part.current_stock}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{part.minimum_stock}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{part.unit}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{part.unit_cost ? `฿${part.unit_cost.toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-3">
                      {isLow ? <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">สต็อกต่ำ</span>
                        : <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">ปกติ</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/stock-transactions?part_id=${part.id}`} className="text-xs text-blue-600 hover:underline">ประวัติ</Link>
                      {canEdit && <Link to={`/spare-parts/${part.id}/edit`} className="ml-3 text-xs text-gray-500 hover:underline">แก้ไข</Link>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
