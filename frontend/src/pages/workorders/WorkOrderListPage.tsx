import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { WorkOrder } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { PriorityBadge, WorkOrderStatusBadge } from '../../components/ui/Badge';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

const STATUSES = ['All', 'Open', 'Assigned', 'In Progress', 'Waiting Spare Part', 'Completed', 'Closed', 'Cancelled'];

export default function WorkOrderListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'priority' | 'status'>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  const { data: workOrders = [], isLoading, isError } = useQuery<WorkOrder[]>({
    queryKey: ['work_orders', status],
    queryFn: async () => {
      let q = supabase.from('work_orders').select('*, asset:assets(name,asset_code), assignee:profiles(full_name)').order('created_at', { ascending: false });
      if (status !== 'All') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    }
  });

  const canCreate = user?.role === 'admin' || user?.role === 'supervisor';

  const filtered = workOrders
    .filter((wo: WorkOrder) =>
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      (wo.wo_number || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: WorkOrder, b: WorkOrder) => {
      const PRIORITY_ORDER = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      if (sortField === 'priority') {
        const diff = (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
        return sortAsc ? -diff : diff;
      }
      const av = (a as any)[sortField] || '';
      const bv = (b as any)[sortField] || '';
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ใบสั่งงาน</h1>
        {canCreate && (
          <Link to="/work-orders/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <PlusIcon className="h-4 w-4" /> สร้างใบสั่งงาน
          </Link>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
            {s === 'All' ? 'ทั้งหมด' : s}
          </button>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาชื่องาน หรือเลขที่ใบสั่งงาน..." className="w-full max-w-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />

      {isLoading && <div className="text-center py-12"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" /></div>}
      {isError && <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-red-600">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>}

      {!isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">เลขที่</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">หัวข้อ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">เครื่องจักร</th>
                  <th onClick={() => toggleSort('priority')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 select-none">
                    ความสำคัญ {sortField === 'priority' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th onClick={() => toggleSort('status')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 select-none">
                    สถานะ {sortField === 'status' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">ผู้รับผิดชอบ</th>
                  <th onClick={() => toggleSort('created_at')} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:text-gray-700 select-none hidden lg:table-cell">
                    วันที่สร้าง {sortField === 'created_at' ? (sortAsc ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">ไม่พบข้อมูล</td></tr>
                )}
                {filtered.map((wo: WorkOrder) => (
                  <tr key={wo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                    <td className="px-4 py-3 text-xs font-mono text-blue-600 dark:text-blue-400">{wo.wo_number || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[180px] truncate">{wo.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{(wo.asset as any)?.name || '-'}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={wo.priority} /></td>
                    <td className="px-4 py-3"><WorkOrderStatusBadge status={wo.status as any} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{(wo.assignee as any)?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{format(parseISO(wo.created_at), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3">
                      <button onClick={e => { e.stopPropagation(); navigate(`/work-orders/${wo.id}`); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
