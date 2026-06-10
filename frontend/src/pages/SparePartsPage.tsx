import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable, { Column } from '../components/ui/DataTable';
import { SparePart } from '../types';
import api from '../lib/api';

const mockParts: SparePart[] = [
  { id: 1, part_number: 'SP-001', part_name: 'Mechanical Seal 50mm', category: 'Seal', unit: 'pcs', current_stock: 5, minimum_stock: 3, storage_location: 'Shelf A-1', unit_cost: 1200 },
  { id: 2, part_number: 'SP-002', part_name: 'Ball Bearing 6205', category: 'Bearing', unit: 'pcs', current_stock: 2, minimum_stock: 5, storage_location: 'Shelf A-2', unit_cost: 350 },
  { id: 3, part_number: 'SP-003', part_name: 'V-Belt A-50', category: 'Belt', unit: 'pcs', current_stock: 10, minimum_stock: 4, storage_location: 'Shelf B-1', unit_cost: 180 },
  { id: 4, part_number: 'SP-004', part_name: 'Air Filter Element', category: 'Filter', unit: 'pcs', current_stock: 0, minimum_stock: 2, storage_location: 'Shelf B-3', unit_cost: 650 },
  { id: 5, part_number: 'SP-005', part_name: 'Hydraulic Oil 46 (20L)', category: 'Lubricant', unit: 'drum', current_stock: 3, minimum_stock: 2, storage_location: 'Storage C', unit_cost: 2800 },
  { id: 6, part_number: 'SP-006', part_name: 'Pressure Gauge 0-10 bar', category: 'Instrument', unit: 'pcs', current_stock: 1, minimum_stock: 2, storage_location: 'Shelf D-1', unit_cost: 890 },
];

const SparePartsPage: React.FC = () => {
  const { t } = useTranslation();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/spare-parts')
      .then((res) => setParts(res.data))
      .catch(() => setParts(mockParts))
      .finally(() => setLoading(false));
  }, []);

  const getStockStatus = (part: SparePart) => {
    if (part.current_stock === 0) return { label: t('spareParts.outOfStock'), cls: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
    if (part.current_stock <= part.minimum_stock) return { label: t('spareParts.lowStock'), cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' };
    return { label: 'OK', cls: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
  };

  const columns: Column<SparePart>[] = [
    {
      key: 'part_number',
      header: t('spareParts.partNumber'),
      render: (row) => <span className="font-medium text-primary-600 dark:text-primary-400">{row.part_number}</span>,
    },
    { key: 'part_name', header: t('spareParts.partName') },
    { key: 'category', header: t('spareParts.category') },
    { key: 'unit', header: t('spareParts.unit') },
    {
      key: 'current_stock',
      header: t('spareParts.currentStock'),
      render: (row) => {
        const { cls } = getStockStatus(row);
        return (
          <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-sm font-bold ${cls}`}>
            {row.current_stock}
          </span>
        );
      },
    },
    { key: 'minimum_stock', header: t('spareParts.minimumStock') },
    { key: 'storage_location', header: t('spareParts.storageLocation') },
    {
      key: 'unit_cost',
      header: t('spareParts.unitCost'),
      render: (row) => row.unit_cost ? `฿${row.unit_cost.toLocaleString()}` : '-',
    },
    {
      key: '_status',
      header: 'Stock Status',
      render: (row) => {
        const { label, cls } = getStockStatus(row);
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {label}
          </span>
        );
      },
    },
  ];

  const lowStockCount = parts.filter((p) => p.current_stock <= p.minimum_stock).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('spareParts.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {parts.length} parts · {lowStockCount} low/out of stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">{t('spareParts.receive')}</Button>
          <Button variant="secondary">{t('spareParts.issue')}</Button>
          <Button variant="primary" icon={<PlusIcon className="h-4 w-4" />}>
            {t('common.create')}
          </Button>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
              {lowStockCount} item(s) at or below minimum stock level
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
              Please review and reorder to avoid production stoppage.
            </p>
          </div>
        </div>
      )}

      <Card noPadding>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={parts}
            loading={loading}
            keyExtractor={(row) => row.id}
          />
        </div>
      </Card>
    </div>
  );
};

export default SparePartsPage;
