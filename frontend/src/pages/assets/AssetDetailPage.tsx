import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import { format } from 'date-fns';

const statusClass: Record<string,string> = { Active:'bg-green-100 text-green-700', 'Under Maintenance':'bg-amber-100 text-amber-700', Inactive:'bg-gray-100 text-gray-600', Disposed:'bg-red-100 text-red-600' };

const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Info');
  const { data: asset, isLoading } = useQuery({ queryKey:['asset',id], queryFn: async () => { const { data } = await supabase.from('assets').select('*').eq('id',id!).single(); return data; }, enabled:!!id });
  const { data: wos = [] } = useQuery({ queryKey:['asset-wo',id], queryFn: async () => { const { data } = await supabase.from('work_orders').select('*').eq('asset_id',id!).order('created_at',{ascending:false}); return data||[]; }, enabled:!!id&&tab==='Work Orders' });
  const { data: pmPlans = [] } = useQuery({ queryKey:['asset-pm',id], queryFn: async () => { const { data } = await supabase.from('pm_plans').select('*').eq('asset_id',id!).order('next_due_date'); return data||[]; }, enabled:!!id&&tab==='PM Plans' });
  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!asset) return <div className="text-center py-20 text-gray-500">Not found</div>;
  const canEdit = user?.role==='admin'||user?.role==='supervisor';
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/assets')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeftIcon className="h-5 w-5" /></button>
        <div className="flex-1"><h1 className="text-xl font-bold text-gray-900 dark:text-white">{asset.name}</h1><p className="text-sm text-gray-500 font-mono">{asset.asset_code}</p></div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass[asset.status]||''}`}>{asset.status}</span>
        {canEdit && <Link to={`/assets/${id}/edit`} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"><PencilSquareIcon className="h-4 w-4" />Edit</Link>}
      </div>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">{['Info','Work Orders','PM Plans'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab===t?'border-primary-600 text-primary-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}</nav>
      </div>
      {tab==='Info' && <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[['Category',asset.category],['Location',asset.location||'—'],['Manufacturer',asset.manufacturer||'—'],['Model',asset.model||'—'],['Serial No.',asset.serial_number||'—'],['Purchase Date',asset.purchase_date?format(new Date(asset.purchase_date),'dd MMM yyyy'):'—'],['Warranty Expiry',asset.warranty_expiry?format(new Date(asset.warranty_expiry),'dd MMM yyyy'):'—'],['Purchase Cost',asset.purchase_cost?`฿${asset.purchase_cost.toLocaleString()}`:'—']].map(([l,v]) => (
            <div key={l as string}><dt className="text-xs font-semibold text-gray-500 uppercase">{l}</dt><dd className="mt-1 text-gray-900 dark:text-white">{v as string}</dd></div>
          ))}
          {asset.description && <div className="col-span-2"><dt className="text-xs font-semibold text-gray-500 uppercase">Description</dt><dd className="mt-1 text-gray-700 dark:text-gray-300">{asset.description}</dd></div>}
        </dl>
      </Card>}
      {tab==='Work Orders' && <Card noPadding>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{['WO #','Title','ประเภท','สถานะ','วันที่'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {wos.length===0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">ไม่มีใบสั่งงาน</td></tr>
              : wos.map((w: any) => (
                <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer" onClick={() => navigate(`/work-orders/${w.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{w.wo_number||`#${w.id}`}</td>
                  <td className="px-4 py-3">{w.title}</td>
                  <td className="px-4 py-3 text-gray-500">{w.type==='Corrective'?'CM':'PM'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${w.status==='Closed'?'bg-gray-100 text-gray-600':w.status==='Completed'?'bg-green-100 text-green-700':w.status==='In Progress'?'bg-blue-100 text-blue-700':'bg-yellow-100 text-yellow-700'}`}>{w.status}</span></td>
                  <td className="px-4 py-3 text-gray-500">{format(new Date(w.created_at),'dd MMM yyyy')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>}
      {tab==='PM Plans' && <Card noPadding>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{['ชื่อแผน','ความถี่','ครั้งต่อไป','ครั้งสุดท้าย','สถานะ'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {pmPlans.length===0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">ไม่มีแผน PM</td></tr>
              : pmPlans.map((p: any) => {
                const isPast = new Date(p.next_due_date) < new Date();
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500">{p.frequency}</td>
                    <td className="px-4 py-3"><span className={isPast?'text-red-600 font-medium':'text-gray-700 dark:text-gray-300'}>{format(new Date(p.next_due_date),'dd MMM yyyy')}</span></td>
                    <td className="px-4 py-3 text-gray-500">{p.last_performed_date?format(new Date(p.last_performed_date),'dd MMM yyyy'):'-'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${isPast?'bg-red-100 text-red-700':'bg-green-100 text-green-700'}`}>{isPast?'เกินกำหนด':'ปกติ'}</span></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </Card>}
    </div>
  );
};
export default AssetDetailPage;
