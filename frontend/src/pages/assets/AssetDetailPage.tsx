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
          <thead className="bg-gray-50 dark:bg-gray-900"><tr>{['WO #','Title','Type','Status','Date'].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {wos.length===0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No work orders found</td></tr>
              : wos.map((w: any) => <tr key={w.id}><td className="px-4 py-3 font-mono text-xs">{w.wo_number||`#${w.id}`}</td><td className="px-4 py-3">{w.title}</td><td className="px-4 py-3">{w.type}</td><td className="px-4 py-3">{w.status}</td><td className="px-4 py-3 text-gray-500">{format(new Date(w.created_at),'dd MMM yyyy')}</td></tr>)}
          </tbody>
        </table>
      </Card>}
    </div>
  );
};
export default AssetDetailPage;
