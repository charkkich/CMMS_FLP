import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { MaintenanceRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { PriorityBadge, RequestStatusBadge } from '../../components/ui/Badge';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const STATUSES = ['All', 'Submitted', 'Approved', 'Rejected', 'In Progress', 'Completed', 'Cancelled'];

export default function RequestListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');

  const { data: requests = [], isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ['maintenance_requests', status],
    queryFn: async () => {
      let q = supabase.from('maintenance_requests').select('*, requester:profiles(full_name), asset:assets(name,asset_code)').order('created_at', { ascending: false });
      if (status !== 'All') q = q.eq('status', status);
      const { data } = await q;
      return (data as any[]) || [];
    }
  });

  const filtered = requests.filter((r: MaintenanceRequest) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.request_number || '').toLowerCase().includes(search.toLowerCase())
  );

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('maintenance_requests').update({ status: 'Approved', approved_by: user?.id }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maintenance_requests'] }); toast.success('อนุมัติสำเร็จ'); },
    onError: (e: any) => toast.error(e.message)
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">คำขอแจ้งซ่อม</h1>
        <button onClick={() => navigate('/requests/new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PlusIcon className="h-4 w-4" /> แจ้งซ่อมใหม่
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>{s}</button>
        ))}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา..." className="w-full max-w-sm px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
      {isLoading ? <div className="text-center py-8 text-gray-500">กำลังโหลด...</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['เลขที่','วันที่','หัวข้อ','ผู้แจ้ง','สถานที่','เครื่องจักร','ความสำคัญ','สถานะ',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((req: MaintenanceRequest) => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm font-mono text-blue-600 dark:text-blue-400">{req.request_number || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{req.created_at ? format(parseISO(req.created_at), 'dd/MM/yyyy') : '-'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[200px] truncate">{req.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{(req.requester as any)?.full_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{req.location || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{(req.asset as any)?.name || '-'}</td>
                  <td className="px-4 py-3"><PriorityBadge priority={req.priority} /></td>
                  <td className="px-4 py-3"><RequestStatusBadge status={req.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/requests/${req.id}`)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded" title="ดูรายละเอียด"><EyeIcon className="h-4 w-4" /></button>
                      {req.status === 'Submitted' && (user?.role === 'admin' || user?.role === 'supervisor') && (
                        <button onClick={() => approveMutation.mutate(req.id)} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">อนุมัติ</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
