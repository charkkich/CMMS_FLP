import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable, { Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import { Asset } from '../types';
import api from '../lib/api';

const mockAssets: Asset[] = [
  { id: 1, asset_id: 'AST-001', asset_name: 'Main Pump A', category: 'Pump', location: 'Building A', manufacturer: 'Grundfos', model: 'CM5-6', purchase_date: '2020-01-15', warranty_expiry: '2025-01-15', status: 'Active' },
  { id: 2, asset_id: 'AST-002', asset_name: 'Standby Generator #1', category: 'Generator', location: 'Outdoor Area', manufacturer: 'Cummins', model: 'C150D5', purchase_date: '2019-06-20', warranty_expiry: '2024-06-20', status: 'Active' },
  { id: 3, asset_id: 'AST-003', asset_name: 'Air Compressor B', category: 'Air Compressor', location: 'Workshop', manufacturer: 'Atlas Copco', model: 'GA15', purchase_date: '2021-03-10', warranty_expiry: '2026-03-10', status: 'Under Maintenance' },
  { id: 4, asset_id: 'AST-004', asset_name: 'Irrigation System Z', category: 'Irrigation System', location: 'Farm Area', manufacturer: 'Netafim', model: 'PRO16', purchase_date: '2018-08-05', warranty_expiry: '2023-08-05', status: 'Active' },
  { id: 5, asset_id: 'AST-005', asset_name: 'Main Electrical Panel 3', category: 'Electrical Panel', location: 'Plant Room', manufacturer: 'Schneider', model: 'Prisma G', purchase_date: '2017-11-30', warranty_expiry: '2022-11-30', status: 'Active' },
];

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'Under Maintenance': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Retired: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Disposed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const AssetsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assets')
      .then((res) => setAssets(res.data))
      .catch(() => setAssets(mockAssets))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<Asset>[] = [
    {
      key: 'asset_id',
      header: t('asset.assetId'),
      render: (row) => <span className="font-medium text-primary-600 dark:text-primary-400">{row.asset_id}</span>,
    },
    { key: 'asset_name', header: t('asset.assetName') },
    {
      key: 'category',
      header: t('asset.category'),
      render: (row) => <Badge>{row.category}</Badge>,
    },
    { key: 'location', header: t('asset.location') },
    { key: 'manufacturer', header: t('asset.manufacturer') },
    { key: 'model', header: t('asset.model') },
    {
      key: 'status',
      header: t('asset.assetStatus'),
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[row.status] || statusColors.Active}`}>
          {row.status}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('asset.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{assets.length} total assets</p>
        </div>
        <Button variant="primary" icon={<PlusIcon className="h-4 w-4" />}>
          {t('common.create')} Asset
        </Button>
      </div>

      <Card noPadding>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={assets}
            loading={loading}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => navigate(`/assets/${row.id}`)}
          />
        </div>
      </Card>
    </div>
  );
};

export default AssetsPage;
