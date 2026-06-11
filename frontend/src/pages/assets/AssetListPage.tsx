import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import DataTable, { Column } from '../../components/ui/DataTable';
import { Asset } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const statusClass: Record<string,string> = { Active:'bg-green-100 text-green-700', 'Under Maintenance':'bg-amber-100 text-amber-700', Inactive:'bg-gray-100 text-gray-600', Disposed:'bg-red-100 text-red-600' };

const AssetListPage: React.FC = () => {
  const { user } = useAuth();
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: async () => { const { data, error } = await supabase.from('assets').select('*').order('asset_code'); if (error) throw error; return (data||[]) as Asset[]; },
  });
  const columns: Column<Asset>[] = [
    { key:'asset_code', header:'Code', render:r => <span className="font-mono text-xs font-semibold">{r.asset_code}</span> },
    { key:'name', header:'Asset Name' },
    { key:'category', header:'Category' },
    { key:'location', header:'Location', render:r => r.location||'—' },
    { key:'manufacturer', header:'Make / Model', render:r => r.manufacturer ? `${r.manufacturer} ${r.model||''}`.trim() : '—' },
    { key:'status', header:'Status', render:r => <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass[r.status]||''}`}>{r.status}</span> },
    { key:'actions', header:'', render:r => <Link to={`/assets/${r.id}`} className="text-primary-600 text-xs font-medium">View →</Link> },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assets</h1><p className="text-sm text-gray-500 mt-0.5">{assets.length} assets</p></div>
        {(user?.role==='admin'||user?.role==='supervisor') && <Link to="/assets/new"><Button icon={<PlusIcon className="h-4 w-4" />}>Add Asset</Button></Link>}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <DataTable columns={columns} data={assets} loading={isLoading} keyExtractor={a => a.id} />
      </div>
    </div>
  );
};
export default AssetListPage;
