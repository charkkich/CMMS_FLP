import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import { Asset } from '../types';
import { format } from 'date-fns';
import api from '../lib/api';

const mockAsset: Asset = {
  id: 1,
  asset_id: 'AST-001',
  asset_name: 'Main Pump A',
  category: 'Pump',
  location: 'Building A',
  serial_number: 'GF-CM5-20200115',
  manufacturer: 'Grundfos',
  model: 'CM5-6',
  purchase_date: '2020-01-15',
  warranty_expiry: '2025-01-15',
  status: 'Active',
  description: 'Primary water supply pump for Building A. Rated at 5 m³/h.',
};

const AssetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'repair' | 'pm'>('info');

  useEffect(() => {
    api.get(`/assets/${id}`)
      .then((res) => setAsset(res.data))
      .catch(() => setAsset(mockAsset))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!asset) return <p>Asset not found</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/assets')} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{asset.asset_name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{asset.asset_id} · {asset.category}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
        {[
          { key: 'info', label: 'Asset Info' },
          { key: 'repair', label: t('asset.repairHistory') },
          { key: 'pm', label: t('asset.pmHistory') },
        ].map((tab_item) => (
          <button
            key={tab_item.key}
            onClick={() => setTab(tab_item.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === tab_item.key
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {tab_item.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: t('asset.assetId'), value: asset.asset_id },
              { label: t('asset.assetStatus'), value: asset.status },
              { label: t('asset.manufacturer'), value: asset.manufacturer },
              { label: t('asset.model'), value: asset.model },
              { label: t('asset.serialNumber'), value: asset.serial_number },
              { label: t('asset.location'), value: asset.location },
              { label: t('asset.purchaseDate'), value: asset.purchase_date ? format(new Date(asset.purchase_date), 'dd MMM yyyy') : '-' },
              { label: t('asset.warrantyExpiry'), value: asset.warranty_expiry ? format(new Date(asset.warranty_expiry), 'dd MMM yyyy') : '-' },
            ].map((f, i) => (
              <div key={i}>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{f.label}</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{f.value || '-'}</p>
              </div>
            ))}
          </div>
          {asset.description && (
            <div className="mt-6">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('common.description')}</label>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">{asset.description}</p>
            </div>
          )}
        </Card>
      )}

      {tab === 'repair' && (
        <Card title={t('asset.repairHistory')}>
          <p className="text-sm text-gray-500 dark:text-gray-400">No repair history available for this asset.</p>
        </Card>
      )}

      {tab === 'pm' && (
        <Card title={t('asset.pmHistory')}>
          <p className="text-sm text-gray-500 dark:text-gray-400">No PM history available for this asset.</p>
        </Card>
      )}
    </div>
  );
};

export default AssetDetailPage;
