import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/ui/Card';
import DataTable, { Column } from '../components/ui/DataTable';
import { StockTransaction } from '../types';
import { format } from 'date-fns';
import api from '../lib/api';

const mockTx: StockTransaction[] = [
  { id: 1, part_id: 2, part_name: 'Ball Bearing 6205', transaction_date: '2024-12-15', transaction_type: 'Issue', quantity: -1, reference_number: 'WO-2024-0023', remark: 'Used for pump repair', balance_after: 2 },
  { id: 2, part_id: 1, part_name: 'Mechanical Seal 50mm', transaction_date: '2024-12-14', transaction_type: 'Receive', quantity: 3, reference_number: 'PO-2024-0156', remark: 'Purchase order received', balance_after: 5 },
  { id: 3, part_id: 3, part_name: 'V-Belt A-50', transaction_date: '2024-12-13', transaction_type: 'Issue', quantity: -2, reference_number: 'WO-2024-0022', remark: 'Belt replacement', balance_after: 10 },
  { id: 4, part_id: 4, part_name: 'Air Filter Element', transaction_date: '2024-12-12', transaction_type: 'Issue', quantity: -1, reference_number: 'WO-2024-0021', remark: 'Monthly PM task', balance_after: 0 },
  { id: 5, part_id: 5, part_name: 'Hydraulic Oil 46 (20L)', transaction_date: '2024-12-10', transaction_type: 'Adjustment', quantity: -1, reference_number: 'ADJ-001', remark: 'Physical count adjustment', balance_after: 3 },
];

const txTypeColors: Record<string, string> = {
  Receive: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Issue: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Adjustment: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

const StockTransactionsPage: React.FC = () => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stock-transactions')
      .then((res) => setTransactions(res.data))
      .catch(() => setTransactions(mockTx))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<StockTransaction>[] = [
    {
      key: 'transaction_date',
      header: t('common.date'),
      render: (row) => format(new Date(row.transaction_date), 'dd MMM yyyy'),
    },
    {
      key: 'transaction_type',
      header: 'Type',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${txTypeColors[row.transaction_type]}`}>
          {t(`spareParts.${row.transaction_type.toLowerCase()}`)}
        </span>
      ),
    },
    { key: 'part_name', header: t('spareParts.partName') },
    {
      key: 'quantity',
      header: 'Qty',
      render: (row) => (
        <span className={`font-semibold ${row.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
        </span>
      ),
    },
    {
      key: 'balance_after',
      header: 'Balance After',
      render: (row) => <span className="font-medium">{row.balance_after}</span>,
    },
    { key: 'reference_number', header: 'Reference' },
    { key: 'remark', header: 'Remark' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('nav.stockTransactions')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{transactions.length} transactions</p>
      </div>

      <Card noPadding>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={transactions}
            loading={loading}
            keyExtractor={(row) => row.id}
          />
        </div>
      </Card>
    </div>
  );
};

export default StockTransactionsPage;
