import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import DataTable, { Column } from '../../components/ui/DataTable';
import { WorkOrder } from '../../types';
import { format } from 'date-fns';

const STATUSES = ['Open','Assigned','In Progress','Completed','Cancelled'];
const typeClass: Record<string,string> = { Corrective:'bg-amber-100 text-amber-700', Preventive:'bg-teal-100 text-teal-700' };
const statusClass: Record<string,string> = { Open:'bg-gray-100 text-gray-600', Assigned:'bg-blue-100 text-blue-700', 'In Progress':'bg-purple-100 text-purple-700', Completed:'bg-green-100 text-green-700', Cancelled:'bg-gray-100 text-gray-500' };

const WorkOrderListPage: React.FC = () => {
  const [sf, setSf] = useState('');
  const { data: wos = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ['work-orders', sf],
    queryFn: async () => {
      let q = supabase.from('work_orders').select('*, asset:assets(name,asset_code), assignee:profiles!assigned_to(full_name)').order('created_at', { ascending: false });
      if (sf) q = q.eq('status', sf);
      const { data, error } = await q; if (error) throw error; return (data||[]) as WorkOrder[];
    },
  });
  const columns: Column<WorkOrder>[] = [
    { key:'wo_number', header:'WO #', render:r => <span className="font-mono text-xs">{r.wo_number||`#${r.id}`}</span> },
    { key:'title', header:'Title' },
    { key:'type', header:'Type', render:r => <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${typeClass[r.type]||''}`}>{r.type}</span> },
    { key:'asset', header:'Asset', render:r => r.asset?.name||'—' },
    { key:'assignee', header:'Assigned To', render:r => r.assignee?.full_name||<span className="text-gray-400 italic text-xs">Unassigned</span> },
    { key:'status', header:'Status', render:r => <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass[r.status]||''}`}>{r.status}</span> },
    { key:'created_at', header:'Created', render:r => format(new Date(r.created_at),'dd MMM yyyy') },
    { key:'actions', header:'', render:r => <Link to={`/work-orders/${r.id}`} className="text-primary-600 text-xs font-medium">View →</Link> },
  ];
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Work Orders</h1><p className="text-sm text-gray-500 mt-0.5">{wos.length} records</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSf('')} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!sf?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>All</button>
        {STATUSES.map(s => <button key={s} onClick={() => setSf(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${sf===s?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>{s}</button>)}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <DataTable columns={columns} data={wos} loading={isLoading} keyExtractor={r => r.id} />
      </div>
    </div>
  );
};
export default WorkOrderListPage;
