import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// ─────────────────────────────────────────────
// CSV helper
// ─────────────────────────────────────────────
function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows.map((r: any) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const PAGE_SIZE = 20;

// ─────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────
type TabKey = 'workorders' | 'requests' | 'pm' | 'stock' | 'assethistory';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'workorders',   label: 'ใบสั่งงาน' },
  { key: 'requests',     label: 'คำขอซ่อมบำรุง' },
  { key: 'pm',           label: 'PM Report' },
  { key: 'stock',        label: 'การเคลื่อนไหวสต็อก' },
  { key: 'assethistory', label: 'ประวัติเครื่องจักร' },
];

// ─────────────────────────────────────────────
// KPI card
// ─────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Pagination helper
// ─────────────────────────────────────────────
function usePagination<T>(data: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const slice = data.slice(safePage * pageSize, safePage * pageSize + pageSize);
  return { slice, page: safePage, totalPages, setPage };
}

// ─────────────────────────────────────────────
// Shared pagination bar
// ─────────────────────────────────────────────
function PaginationBar({ page, totalPages, setPage, total }: {
  page: number; totalPages: number; setPage: (p: number) => void; total: number;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
      <span>แสดง {Math.min((page + 1) * PAGE_SIZE, total)} / {total} รายการ</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(Math.max(0, page - 1))}
          disabled={page === 0}
          className="p-1 rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <span>หน้า {page + 1} / {totalPages}</span>
        <button
          onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
          disabled={page >= totalPages - 1}
          className="p-1 rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Shared table wrapper
// ─────────────────────────────────────────────
function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 whitespace-nowrap">
    {children}
  </th>
);

const Td = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-3 py-2.5 text-gray-800 dark:text-gray-200 whitespace-nowrap ${className}`}>
    {children}
  </td>
);

// Status badge
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    Completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    Closed: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    'Waiting Spare Part': 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    Overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    Due: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  };
  const cls = map[status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

// Priority badge
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    Critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    Low: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  };
  const cls = map[priority] ?? 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{priority}</span>;
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('workorders');
  const [dateFrom, setDateFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('');
  const [assetFilter, setAssetFilter] = useState('');
  const [technicianFilter, setTechnicianFilter] = useState('');

  // ── Assets dropdown ──
  const { data: assets = [] } = useQuery({
    queryKey: ['filter_assets'],
    queryFn: async () => {
      const { data } = await supabase.from('assets').select('id, name').order('name');
      return (data as any[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Technicians dropdown ──
  const { data: technicians = [] } = useQuery({
    queryKey: ['filter_technicians'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician')
        .order('full_name');
      return (data as any[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Work Orders ──
  const { data: workorders = [], isLoading: woLoading } = useQuery({
    queryKey: ['report_wo', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('work_orders')
        .select(`
          id, wo_number, title, type, status, priority,
          actual_hours, labor_cost, parts_cost,
          created_at, completed_at,
          assets(asset_name),
          profiles(full_name)
        `)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: activeTab === 'workorders',
  });

  // ── Maintenance Requests ──
  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ['report_requests', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('maintenance_requests')
        .select(`
          id, request_number, title, priority, status,
          location, created_at,
          requester:profiles!maintenance_requests_requester_id_fkey(full_name),
          assets(asset_name)
        `)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: activeTab === 'requests',
  });

  // ── PM ──
  const { data: pmPlans = [], isLoading: pmLoading } = useQuery({
    queryKey: ['report_pm', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('pm_plans')
        .select(`
          id, pm_code, title, frequency, last_completed, next_due_date, status,
          assets(asset_name),
          profiles(full_name)
        `)
        .order('next_due_date');
      return (data as any[]) || [];
    },
    enabled: activeTab === 'pm',
  });

  // ── Stock Transactions ──
  const { data: stockTx = [], isLoading: stockLoading } = useQuery({
    queryKey: ['report_stock', dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from('stock_transactions')
        .select(`
          id, transaction_date, transaction_type, quantity, balance_after,
          reference_number, wo_number,
          spare_parts(part_name),
          profiles(full_name)
        `)
        .gte('transaction_date', dateFrom)
        .lte('transaction_date', dateTo + 'T23:59:59')
        .order('transaction_date', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: activeTab === 'stock',
  });

  // ── Asset History ──
  const { data: assetHistory = [], isLoading: ahLoading } = useQuery({
    queryKey: ['report_assethistory', dateFrom, dateTo, assetFilter],
    queryFn: async () => {
      let q = supabase
        .from('work_orders')
        .select(`
          id, wo_number, title, status, priority,
          actual_hours, labor_cost, parts_cost,
          created_at, completed_at,
          assets(id, asset_name),
          profiles(full_name)
        `)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });
      if (assetFilter) q = q.eq('asset_id', assetFilter);
      const { data } = await q;
      return (data as any[]) || [];
    },
    enabled: activeTab === 'assethistory',
  });

  // ─────────────────────────────────────────
  // Filtered data
  // ─────────────────────────────────────────
  const filteredWO = useMemo(() => workorders.filter((w: any) => {
    if (statusFilter && w.status !== statusFilter) return false;
    if (assetFilter && w.assets?.id !== assetFilter && String(w.asset_id) !== assetFilter) return false;
    if (technicianFilter && String(w.assigned_to) !== technicianFilter) return false;
    return true;
  }), [workorders, statusFilter, assetFilter, technicianFilter]);

  const filteredRequests = useMemo(() => requests.filter((r: any) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (assetFilter && String(r.asset_id) !== assetFilter) return false;
    return true;
  }), [requests, statusFilter, assetFilter]);

  const filteredPM = useMemo(() => pmPlans.filter((p: any) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (assetFilter && String(p.asset_id) !== assetFilter) return false;
    return true;
  }), [pmPlans, statusFilter, assetFilter]);

  // ─────────────────────────────────────────
  // Paginations
  // ─────────────────────────────────────────
  const woPag    = usePagination(filteredWO);
  const reqPag   = usePagination(filteredRequests);
  const pmPag    = usePagination(filteredPM);
  const stockPag = usePagination(stockTx);
  const ahPag    = usePagination(assetHistory);

  // ─────────────────────────────────────────
  // KPIs
  // ─────────────────────────────────────────
  const woKpi = useMemo(() => {
    const completed = filteredWO.filter((w: any) => ['Completed', 'Closed'].includes(w.status));
    const totalHours = filteredWO.reduce((s: number, w: any) => s + (w.actual_hours || 0), 0);
    const totalCost = filteredWO.reduce((s: number, w: any) => s + (w.labor_cost || 0) + (w.parts_cost || 0), 0);
    return {
      total: filteredWO.length,
      completed: completed.length,
      avgHours: filteredWO.length ? (totalHours / filteredWO.length).toFixed(1) : '0',
      totalCost,
    };
  }, [filteredWO]);

  const reqKpi = useMemo(() => ({
    total:     filteredRequests.length,
    submitted: filteredRequests.filter((r: any) => r.status === 'Submitted').length,
    approved:  filteredRequests.filter((r: any) => r.status === 'Approved').length,
    rejected:  filteredRequests.filter((r: any) => r.status === 'Rejected').length,
  }), [filteredRequests]);

  const pmKpi = useMemo(() => {
    const now = new Date();
    const thisMonth = format(now, 'yyyy-MM');
    const overdue = filteredPM.filter((p: any) => p.status === 'Overdue' || (p.next_due_date && new Date(p.next_due_date) < now && p.status !== 'Completed')).length;
    const completedThisMonth = filteredPM.filter((p: any) => p.last_completed?.startsWith(thisMonth)).length;
    const compliance = filteredPM.length ? Math.round((completedThisMonth / filteredPM.length) * 100) : 0;
    return { total: filteredPM.length, overdue, completedThisMonth, compliance };
  }, [filteredPM]);

  // ─────────────────────────────────────────
  // Chart data
  // ─────────────────────────────────────────
  const woStatusChart = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredWO.forEach((w: any) => { acc[w.status] = (acc[w.status] || 0) + 1; });
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [filteredWO]);

  const reqPriorityChart = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredRequests.forEach((r: any) => { acc[r.priority] = (acc[r.priority] || 0) + 1; });
    return Object.entries(acc).map(([name, value]) => ({ name, value }));
  }, [filteredRequests]);

  // ─────────────────────────────────────────
  // Export handlers
  // ─────────────────────────────────────────
  const exportWO = () => {
    const headers = ['WO#', 'หัวข้อ', 'ประเภท', 'สถานะ', 'ความสำคัญ', 'ทรัพย์สิน', 'ช่าง', 'วันที่สร้าง', 'วันที่เสร็จ', 'ชั่วโมง', 'ค่าแรง', 'ค่าอะไหล่'];
    const rows = filteredWO.map((w: any) => [
      w.wo_number || '', w.title || '', w.type || '', w.status || '', w.priority || '',
      w.assets?.asset_name || '', w.profiles?.full_name || '',
      w.created_at?.split('T')[0] || '', w.completed_at?.split('T')[0] || '',
      w.actual_hours || 0, w.labor_cost || 0, w.parts_cost || 0,
    ]);
    downloadCsv(`work_orders_${dateFrom}_${dateTo}.csv`, [headers, ...rows]);
  };

  const exportRequests = () => {
    const headers = ['Request#', 'หัวข้อ', 'ความสำคัญ', 'สถานะ', 'ผู้แจ้ง', 'ทรัพย์สิน', 'สถานที่', 'วันที่'];
    const rows = filteredRequests.map((r: any) => [
      r.request_number || '', r.title || '', r.priority || '', r.status || '',
      r.requester?.full_name || '', r.assets?.asset_name || '', r.location || '',
      r.created_at?.split('T')[0] || '',
    ]);
    downloadCsv(`requests_${dateFrom}_${dateTo}.csv`, [headers, ...rows]);
  };

  const exportPM = () => {
    const headers = ['PM Code', 'ทรัพย์สิน', 'หัวข้อ', 'ความถี่', 'ทำล่าสุด', 'ครบกำหนด', 'สถานะ', 'ผู้ดำเนินการ'];
    const rows = filteredPM.map((p: any) => [
      p.pm_code || '', p.assets?.asset_name || '', p.title || '', p.frequency || '',
      p.last_completed || '', p.next_due_date || '', p.status || '',
      p.profiles?.full_name || '',
    ]);
    downloadCsv(`pm_report_${dateFrom}_${dateTo}.csv`, [headers, ...rows]);
  };

  const exportStock = () => {
    const headers = ['วันที่', 'อะไหล่', 'ประเภท', 'จำนวน', 'ยอดคงเหลือ', 'อ้างอิง', 'WO#', 'ดำเนินการโดย'];
    const rows = stockTx.map((s: any) => [
      s.transaction_date?.split('T')[0] || '', s.spare_parts?.part_name || '',
      s.transaction_type || '', s.quantity || 0, s.balance_after || 0,
      s.reference_number || '', s.wo_number || '', s.profiles?.full_name || '',
    ]);
    downloadCsv(`stock_transactions_${dateFrom}_${dateTo}.csv`, [headers, ...rows]);
  };

  const exportAssetHistory = () => {
    const headers = ['WO#', 'หัวข้อ', 'ทรัพย์สิน', 'สถานะ', 'ความสำคัญ', 'ชั่วโมง', 'ค่าแรง', 'ค่าอะไหล่', 'วันที่สร้าง', 'วันที่เสร็จ'];
    const rows = assetHistory.map((w: any) => [
      w.wo_number || '', w.title || '', w.assets?.asset_name || '', w.status || '', w.priority || '',
      w.actual_hours || 0, w.labor_cost || 0, w.parts_cost || 0,
      w.created_at?.split('T')[0] || '', w.completed_at?.split('T')[0] || '',
    ]);
    downloadCsv(`asset_history_${dateFrom}_${dateTo}.csv`, [headers, ...rows]);
  };

  const exportFns: Record<TabKey, () => void> = {
    workorders: exportWO,
    requests: exportRequests,
    pm: exportPM,
    stock: exportStock,
    assethistory: exportAssetHistory,
  };

  const isLoading = woLoading || reqLoading || pmLoading || stockLoading || ahLoading;

  // ─────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายงาน</h1>
        <button
          onClick={exportFns[activeTab]}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-colors"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-xl shadow p-1 overflow-x-auto">
        {TABS.map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">วันที่เริ่ม</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">วันที่สิ้นสุด</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">สถานะ</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">ทั้งหมด</option>
              {activeTab === 'workorders' || activeTab === 'assethistory' ? (
                <>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting Spare Part">Waiting Spare Part</option>
                  <option value="Completed">Completed</option>
                  <option value="Closed">Closed</option>
                </>
              ) : activeTab === 'requests' ? (
                <>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Converted to Work Order">Converted to WO</option>
                </>
              ) : activeTab === 'pm' ? (
                <>
                  <option value="Active">Active</option>
                  <option value="Overdue">Overdue</option>
                  <option value="Completed">Completed</option>
                </>
              ) : null}
            </select>
          </div>
          {/* Asset */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">ทรัพย์สิน</label>
            <select
              value={assetFilter}
              onChange={e => setAssetFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]"
            >
              <option value="">ทั้งหมด</option>
              {assets.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          {/* Technician (WO / AssetHistory only) */}
          {(activeTab === 'workorders' || activeTab === 'assethistory') && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">ช่าง</label>
              <select
                value={technicianFilter}
                onChange={e => setTechnicianFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[160px]"
              >
                <option value="">ทั้งหมด</option>
                {technicians.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* TAB: Work Orders                  */}
      {/* ══════════════════════════════════ */}
      {activeTab === 'workorders' && !woLoading && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="ใบสั่งงานทั้งหมด"    value={woKpi.total} />
            <KpiCard label="เสร็จสิ้น/ปิด"        value={woKpi.completed} />
            <KpiCard label="เฉลี่ยชั่วโมง/งาน"    value={woKpi.avgHours} sub="ชั่วโมง" />
            <KpiCard label="ค่าใช้จ่ายรวม"        value={`฿${woKpi.totalCost.toLocaleString()}`} />
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">ใบสั่งงานตามสถานะ</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={woStatusChart} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f9fafb' }} />
                <Bar dataKey="value" name="จำนวน" radius={[4, 4, 0, 0]}>
                  {woStatusChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <TableWrapper>
            <thead>
              <tr>
                <Th>WO#</Th><Th>หัวข้อ</Th><Th>ประเภท</Th><Th>สถานะ</Th>
                <Th>ความสำคัญ</Th><Th>ทรัพย์สิน</Th><Th>ช่าง</Th>
                <Th>วันที่สร้าง</Th><Th>วันที่เสร็จ</Th><Th>ชั่วโมง</Th>
                <Th>ค่าแรง (฿)</Th><Th>ค่าอะไหล่ (฿)</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {woPag.slice.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : woPag.slice.map((w: any) => (
                <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td className="font-mono text-xs">{w.wo_number}</Td>
                  <Td className="max-w-[180px] truncate">{w.title}</Td>
                  <Td>{w.type}</Td>
                  <Td><StatusBadge status={w.status} /></Td>
                  <Td><PriorityBadge priority={w.priority} /></Td>
                  <Td>{w.assets?.asset_name || '—'}</Td>
                  <Td>{w.profiles?.full_name || '—'}</Td>
                  <Td>{w.created_at?.split('T')[0] || '—'}</Td>
                  <Td>{w.completed_at?.split('T')[0] || '—'}</Td>
                  <Td className="text-right">{w.actual_hours ?? '—'}</Td>
                  <Td className="text-right">{(w.labor_cost || 0).toLocaleString()}</Td>
                  <Td className="text-right">{(w.parts_cost || 0).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PaginationBar page={woPag.page} totalPages={woPag.totalPages} setPage={woPag.setPage} total={filteredWO.length} />
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* TAB: Maintenance Requests         */}
      {/* ══════════════════════════════════ */}
      {activeTab === 'requests' && !reqLoading && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="คำขอทั้งหมด"    value={reqKpi.total} />
            <KpiCard label="รอพิจารณา"       value={reqKpi.submitted} />
            <KpiCard label="อนุมัติแล้ว"     value={reqKpi.approved} />
            <KpiCard label="ปฏิเสธ"          value={reqKpi.rejected} />
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">คำขอตามความสำคัญ</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={reqPriorityChart}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {reqPriorityChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#f9fafb' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <TableWrapper>
            <thead>
              <tr>
                <Th>Request#</Th><Th>หัวข้อ</Th><Th>ความสำคัญ</Th><Th>สถานะ</Th>
                <Th>ผู้แจ้ง</Th><Th>ทรัพย์สิน</Th><Th>สถานที่</Th><Th>วันที่</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {reqPag.slice.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : reqPag.slice.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td className="font-mono text-xs">{r.request_number}</Td>
                  <Td className="max-w-[180px] truncate">{r.title}</Td>
                  <Td><PriorityBadge priority={r.priority} /></Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>{r.requester?.full_name || '—'}</Td>
                  <Td>{r.assets?.asset_name || '—'}</Td>
                  <Td>{r.location || '—'}</Td>
                  <Td>{r.created_at?.split('T')[0] || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PaginationBar page={reqPag.page} totalPages={reqPag.totalPages} setPage={reqPag.setPage} total={filteredRequests.length} />
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* TAB: PM Report                    */}
      {/* ══════════════════════════════════ */}
      {activeTab === 'pm' && !pmLoading && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="แผน PM ทั้งหมด"        value={pmKpi.total} />
            <KpiCard label="เกินกำหนด"              value={pmKpi.overdue} />
            <KpiCard label="เสร็จเดือนนี้"           value={pmKpi.completedThisMonth} />
            <KpiCard label="Compliance Rate"        value={`${pmKpi.compliance}%`} />
          </div>

          {/* Compliance gauge */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">อัตราการปฏิบัติตามแผน (Compliance Rate)</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-xs font-bold text-white ${
                    pmKpi.compliance >= 80 ? 'bg-green-500' : pmKpi.compliance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${pmKpi.compliance}%`, minWidth: pmKpi.compliance > 0 ? '2.5rem' : '0' }}
                >
                  {pmKpi.compliance > 5 ? `${pmKpi.compliance}%` : ''}
                </div>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white w-14 text-right">{pmKpi.compliance}%</span>
            </div>
          </div>

          {/* Table */}
          <TableWrapper>
            <thead>
              <tr>
                <Th>PM Code</Th><Th>ทรัพย์สิน</Th><Th>หัวข้อ</Th><Th>ความถี่</Th>
                <Th>ทำล่าสุด</Th><Th>ครบกำหนด</Th><Th>สถานะ</Th><Th>ผู้ดำเนินการ</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pmPag.slice.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : pmPag.slice.map((p: any) => {
                const isOverdue = p.next_due_date && new Date(p.next_due_date) < new Date() && p.status !== 'Completed';
                return (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <Td className="font-mono text-xs">{p.pm_code}</Td>
                    <Td>{p.assets?.asset_name || '—'}</Td>
                    <Td className="max-w-[180px] truncate">{p.title}</Td>
                    <Td>{p.frequency}</Td>
                    <Td>{p.last_completed || '—'}</Td>
                    <Td className={isOverdue ? 'text-red-500 font-medium' : ''}>{p.next_due_date || '—'}</Td>
                    <Td><StatusBadge status={isOverdue ? 'Overdue' : (p.status || 'Active')} /></Td>
                    <Td>{p.profiles?.full_name || '—'}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrapper>
          <PaginationBar page={pmPag.page} totalPages={pmPag.totalPages} setPage={pmPag.setPage} total={filteredPM.length} />
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* TAB: Stock Transactions           */}
      {/* ══════════════════════════════════ */}
      {activeTab === 'stock' && !stockLoading && (
        <div className="space-y-4">
          <TableWrapper>
            <thead>
              <tr>
                <Th>วันที่</Th><Th>อะไหล่</Th><Th>ประเภท</Th><Th>จำนวน</Th>
                <Th>ยอดคงเหลือ</Th><Th>อ้างอิง</Th><Th>WO#</Th><Th>ดำเนินการโดย</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {stockPag.slice.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : stockPag.slice.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td>{s.transaction_date?.split('T')[0] || '—'}</Td>
                  <Td>{s.spare_parts?.part_name || '—'}</Td>
                  <Td>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.transaction_type === 'Receive'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                        : s.transaction_type === 'Issue'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {s.transaction_type}
                    </span>
                  </Td>
                  <Td className={`text-right font-medium ${s.transaction_type === 'Issue' ? 'text-red-500' : 'text-green-600'}`}>
                    {s.transaction_type === 'Issue' ? '-' : '+'}{Math.abs(s.quantity || 0)}
                  </Td>
                  <Td className="text-right">{s.balance_after ?? '—'}</Td>
                  <Td className="font-mono text-xs">{s.reference_number || '—'}</Td>
                  <Td className="font-mono text-xs">{s.wo_number || '—'}</Td>
                  <Td>{s.profiles?.full_name || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PaginationBar page={stockPag.page} totalPages={stockPag.totalPages} setPage={stockPag.setPage} total={stockTx.length} />
        </div>
      )}

      {/* ══════════════════════════════════ */}
      {/* TAB: Asset History                */}
      {/* ══════════════════════════════════ */}
      {activeTab === 'assethistory' && !ahLoading && (
        <div className="space-y-4">
          <TableWrapper>
            <thead>
              <tr>
                <Th>WO#</Th><Th>หัวข้อ</Th><Th>ทรัพย์สิน</Th><Th>สถานะ</Th>
                <Th>ความสำคัญ</Th><Th>ชั่วโมง</Th><Th>ค่าแรง (฿)</Th>
                <Th>ค่าอะไหล่ (฿)</Th><Th>วันที่สร้าง</Th><Th>วันที่เสร็จ</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {ahPag.slice.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">ไม่มีข้อมูล</td></tr>
              ) : ahPag.slice.map((w: any) => (
                <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <Td className="font-mono text-xs">{w.wo_number}</Td>
                  <Td className="max-w-[160px] truncate">{w.title}</Td>
                  <Td>{w.assets?.asset_name || '—'}</Td>
                  <Td><StatusBadge status={w.status} /></Td>
                  <Td><PriorityBadge priority={w.priority} /></Td>
                  <Td className="text-right">{w.actual_hours ?? '—'}</Td>
                  <Td className="text-right">{(w.labor_cost || 0).toLocaleString()}</Td>
                  <Td className="text-right">{(w.parts_cost || 0).toLocaleString()}</Td>
                  <Td>{w.created_at?.split('T')[0] || '—'}</Td>
                  <Td>{w.completed_at?.split('T')[0] || '—'}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrapper>
          <PaginationBar page={ahPag.page} totalPages={ahPag.totalPages} setPage={ahPag.setPage} total={assetHistory.length} />
        </div>
      )}
    </div>
  );
}
