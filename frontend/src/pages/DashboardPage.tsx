import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfMonth, endOfMonth, isAfter, isBefore, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  WrenchScrewdriverIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon,
  ClockIcon, ArchiveBoxIcon, CalendarDaysIcon, ChartBarIcon,
  CheckCircleIcon, ArrowRightIcon
} from '@heroicons/react/24/outline';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PRIORITY_CLS: Record<string, string> = {
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_CLS: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Approved: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'In Progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  Open: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Assigned: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  Closed: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

interface KpiProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'red' | 'green' | 'purple' | 'orange' | 'teal' | 'indigo';
  sub?: string;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  teal: 'bg-teal-500',
  indigo: 'bg-indigo-500',
};

const BG_LIGHT: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-900/20',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20',
  red: 'bg-red-50 dark:bg-red-900/20',
  green: 'bg-green-50 dark:bg-green-900/20',
  purple: 'bg-purple-50 dark:bg-purple-900/20',
  orange: 'bg-orange-50 dark:bg-orange-900/20',
  teal: 'bg-teal-50 dark:bg-teal-900/20',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
};

const TEXT_CLR: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  red: 'text-red-600 dark:text-red-400',
  green: 'text-green-600 dark:text-green-400',
  purple: 'text-purple-600 dark:text-purple-400',
  orange: 'text-orange-600 dark:text-orange-400',
  teal: 'text-teal-600 dark:text-teal-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
};

const KpiCard: React.FC<KpiProps> = ({ title, value, icon, color, sub }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4">
    <div className={`${BG_LIGHT[color]} p-3 rounded-lg`}>
      <div className={TEXT_CLR[color]}>{icon}</div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${TEXT_CLR[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ─── Supervisor / Admin Dashboard ───────────────────────────────────────────

const SupervisorDashboard: React.FC = () => {
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-supervisor'],
    queryFn: async () => {
      const [mr, wo, pm, sp, spReqs] = await Promise.all([
        supabase.from('maintenance_requests').select('id, request_number, title, status, priority, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('work_orders').select('id, wo_number, status, priority, scheduled_end, created_at'),
        supabase.from('pm_plans').select('next_due_date, is_active'),
        supabase.from('spare_parts').select('id, name, current_stock, minimum_stock'),
        supabase.from('spare_part_requests').select('id, status').eq('status', 'Pending'),
      ]);

      const requests = (mr.data as any[]) || [];
      const workOrders = (wo.data as any[]) || [];
      const pmPlans = (pm.data as any[]) || [];
      const parts = (sp.data as any[]) || [];

      const openRequests = requests.filter((r: any) => ['Submitted'].includes(r.status)).length;
      const activeWOs = workOrders.filter((w: any) => !['Completed', 'Closed', 'Cancelled'].includes(w.status)).length;
      const overdueWOs = workOrders.filter((w: any) => {
        if (['Closed', 'Cancelled', 'Completed'].includes(w.status)) return false;
        return w.scheduled_end && isBefore(parseISO(w.scheduled_end), today);
      }).length;
      const waitingPart = workOrders.filter((w: any) => w.status === 'Waiting Spare Part').length;

      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const pmDueThisMonth = pmPlans.filter((p: any) =>
        p.is_active && p.next_due_date &&
        !isBefore(parseISO(p.next_due_date), monthStart) &&
        !isAfter(parseISO(p.next_due_date), monthEnd)
      ).length;

      const lowStock = parts.filter((p: any) => p.minimum_stock > 0 && p.current_stock <= p.minimum_stock).length;

      // WO status distribution
      const woByStatus: Record<string, number> = {};
      workOrders.forEach((w: any) => { woByStatus[w.status] = (woByStatus[w.status] || 0) + 1; });
      const woStatusChart = Object.entries(woByStatus).map(([name, value]) => ({ name, value }));

      // Monthly requests trend (last 6 months)
      const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(today, 5 - i);
        const m = format(d, 'yyyy-MM');
        return {
          month: format(d, 'MMM yy', { locale: th }),
          คำขอ: requests.filter((r: any) => r.created_at?.startsWith(m)).length,
        };
      });

      return { openRequests, activeWOs, overdueWOs, waitingPart, pmDueThisMonth, lowStock, woStatusChart, monthly, requests };
    },
    staleTime: 60_000,
  });

  const kpis: KpiProps[] = [
    { title: 'คำขอรอดำเนินการ', value: data?.openRequests ?? 0, icon: <ClipboardDocumentListIcon className="h-6 w-6" />, color: 'blue' },
    { title: 'ใบสั่งงานที่ใช้งาน', value: data?.activeWOs ?? 0, icon: <WrenchScrewdriverIcon className="h-6 w-6" />, color: 'yellow' },
    { title: 'ใบสั่งงานเกินกำหนด', value: data?.overdueWOs ?? 0, icon: <ExclamationTriangleIcon className="h-6 w-6" />, color: 'red' },
    { title: 'รอชิ้นส่วนอะไหล่', value: data?.waitingPart ?? 0, icon: <ArchiveBoxIcon className="h-6 w-6" />, color: 'orange' },
    { title: 'PM ครบกำหนดเดือนนี้', value: data?.pmDueThisMonth ?? 0, icon: <CalendarDaysIcon className="h-6 w-6" />, color: 'teal' },
    { title: 'สต็อกต่ำกว่ากำหนด', value: data?.lowStock ?? 0, icon: <ExclamationTriangleIcon className="h-6 w-6" />, color: 'purple' },
  ];

  const WO_COLOR: Record<string, string> = { Open: '#f59e0b', Assigned: '#6366f1', 'In Progress': '#8b5cf6', Completed: '#22c55e', Closed: '#6b7280', Cancelled: '#9ca3af', 'Waiting Spare Part': '#f97316' };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">แดชบอร์ด</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{format(today, 'EEEE d MMMM yyyy', { locale: th })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k: any) => (
          <KpiCard key={k.title} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="การกระจายสถานะใบสั่งงาน" action={<ChartBarIcon className="h-4 w-4 text-gray-400" />}>
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">กำลังโหลด...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.woStatusChart || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" name="จำนวน" radius={[4, 4, 0, 0]} maxBarSize={40}
                  fill="#6366f1"
                  label={{ position: 'top', fontSize: 10, fill: '#6b7280' }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="แนวโน้มคำขอ 6 เดือนล่าสุด">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">กำลังโหลด...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.monthly || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="คำขอ" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="คำขอซ่อมบำรุงล่าสุด (10 รายการ)"
        action={<Link to="/requests" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">ดูทั้งหมด <ArrowRightIcon className="h-3 w-3" /></Link>}
      >
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['เลขที่คำขอ', 'หัวข้อ', 'ความเร่งด่วน', 'สถานะ', 'วันที่ยื่น'].map((h: any) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {(data?.requests || []).slice(0, 10).map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{r.request_number || `#${r.id?.slice(0, 8)}`}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                      <Link to={`/requests/${r.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">{r.title || '-'}</Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CLS[r.priority] || ''}`}>{r.priority || '-'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[r.status] || ''}`}>{r.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">
                      {r.created_at ? format(parseISO(r.created_at), 'd MMM yy', { locale: th }) : '-'}
                    </td>
                  </tr>
                ))}
                {!data?.requests?.length && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">ยังไม่มีคำขอ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ─── Technician Dashboard ────────────────────────────────────────────────────

const TechnicianDashboard: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();
  const monthStart = startOfMonth(today);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-technician', user?.id],
    queryFn: async () => {
      const { data: wos, error } = await supabase
        .from('work_orders')
        .select('id, wo_number, title, status, priority, scheduled_end, created_at, asset_id, asset:assets(name,asset_code)')
        .eq('assigned_to', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const workOrders = (wos as any[]) || [];

      const assigned = workOrders.filter((w: any) => w.status === 'Assigned');
      const inProgress = workOrders.filter((w: any) => w.status === 'In Progress');
      const completedThisMonth = workOrders.filter((w: any) =>
        w.status === 'Completed' && w.created_at && !isBefore(parseISO(w.created_at), monthStart)
      );
      const actionable = workOrders.filter((w: any) => ['Assigned', 'In Progress'].includes(w.status));

      return { assigned, inProgress, completedThisMonth, actionable, workOrders };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">แดชบอร์ดช่างเทคนิค</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          สวัสดี {user?.full_name || 'ช่าง'} — {format(today, 'd MMMM yyyy', { locale: th })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="งานที่ได้รับมอบหมาย" value={data?.assigned.length ?? 0} icon={<ClipboardDocumentListIcon className="h-6 w-6" />} color="blue" sub="รอเริ่มงาน" />
        <KpiCard title="งานกำลังดำเนินการ" value={data?.inProgress.length ?? 0} icon={<WrenchScrewdriverIcon className="h-6 w-6" />} color="purple" sub="กำลังดำเนินการอยู่" />
        <KpiCard title="งานเสร็จเดือนนี้" value={data?.completedThisMonth.length ?? 0} icon={<CheckCircleIcon className="h-6 w-6" />} color="green" sub="เดือนปัจจุบัน" />
      </div>

      <SectionCard
        title="ใบสั่งงานที่ต้องดำเนินการ"
        action={<Link to="/work-orders" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">ดูทั้งหมด <ArrowRightIcon className="h-3 w-3" /></Link>}
      >
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : (data?.actionable || []).length === 0 ? (
          <div className="text-center py-12">
            <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">ไม่มีงานที่รอดำเนินการ</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(data?.actionable || []).map((wo: any) => (
              <div key={wo.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{wo.wo_number}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[wo.status] || ''}`}>{wo.status}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CLS[wo.priority] || ''}`}>{wo.priority}</span>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{wo.title}</p>
                  {wo.asset?.name && <p className="text-xs text-gray-500 mt-0.5">เครื่องจักร: {wo.asset.name}</p>}
                  {wo.scheduled_end && (
                    <p className={`text-xs mt-0.5 ${isBefore(parseISO(wo.scheduled_end), today) ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      กำหนดเสร็จ: {format(parseISO(wo.scheduled_end), 'd MMM yyyy', { locale: th })}
                      {isBefore(parseISO(wo.scheduled_end), today) && ' ⚠ เกินกำหนด'}
                    </p>
                  )}
                </div>
                <Link
                  to={`/work-orders/${wo.id}`}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors whitespace-nowrap"
                >
                  ดูงาน <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ─── Store Keeper Dashboard ──────────────────────────────────────────────────

const StoreKeeperDashboard: React.FC = () => {
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-storekeeper'],
    queryFn: async () => {
      const [spReqsRes, partsRes, txRes] = await Promise.all([
        supabase.from('spare_part_requests').select('id, part_name, quantity_requested, status, created_at, work_order_id').eq('status', 'Pending').order('created_at', { ascending: false }),
        supabase.from('spare_parts').select('id, name, part_code, current_stock, minimum_stock, unit').order('current_stock', { ascending: true }),
        supabase.from('stock_transactions').select('id, transaction_type, quantity, created_at, part:spare_parts(name,part_code), remark').order('created_at', { ascending: false }).limit(10),
      ]);

      const spReqs = (spReqsRes.data as any[]) || [];
      const parts = (partsRes.data as any[]) || [];
      const transactions = (txRes.data as any[]) || [];

      const lowStock = parts.filter((p: any) => p.minimum_stock > 0 && p.current_stock > 0 && p.current_stock <= p.minimum_stock);
      const outOfStock = parts.filter((p: any) => p.current_stock === 0);

      return { spReqs, lowStock, outOfStock, transactions };
    },
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">แดชบอร์ดคลังวัสดุ</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{format(today, 'd MMMM yyyy', { locale: th })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="คำขออะไหล่รอดำเนินการ" value={data?.spReqs.length ?? 0} icon={<ClipboardDocumentListIcon className="h-6 w-6" />} color="yellow" sub="รอการอนุมัติ" />
        <KpiCard title="อะไหล่สต็อกต่ำ" value={data?.lowStock.length ?? 0} icon={<ExclamationTriangleIcon className="h-6 w-6" />} color="orange" sub="ต่ำกว่าจุดสั่งซื้อ" />
        <KpiCard title="อะไหล่หมดสต็อก" value={data?.outOfStock.length ?? 0} icon={<ArchiveBoxIcon className="h-6 w-6" />} color="red" sub="จำนวน 0 ชิ้น" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="คำขออะไหล่รอดำเนินการ"
          action={<Link to="/spare-parts/requests" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">ดูทั้งหมด <ArrowRightIcon className="h-3 w-3" /></Link>}
        >
          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">กำลังโหลด...</div>
          ) : (data?.spReqs || []).length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">ไม่มีคำขอรอดำเนินการ</div>
          ) : (
            <div className="space-y-2">
              {(data?.spReqs || []).slice(0, 8).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{r.part_name || 'ไม่ระบุชื่อ'}</p>
                    <p className="text-xs text-gray-500">จำนวน: {r.quantity_requested} | {r.created_at ? format(parseISO(r.created_at), 'd MMM yy', { locale: th }) : ''}</p>
                  </div>
                  <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 whitespace-nowrap">รอดำเนินการ</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="อะไหล่สต็อกต่ำ / หมด"
          action={<Link to="/spare-parts" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">จัดการสต็อก <ArrowRightIcon className="h-3 w-3" /></Link>}
        >
          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-sm">กำลังโหลด...</div>
          ) : ([...(data?.outOfStock || []), ...(data?.lowStock || [])]).length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-10 w-10 text-green-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">สต็อกทุกรายการอยู่ในระดับปกติ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...(data?.outOfStock || []), ...(data?.lowStock || [])].slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.part_code} | ต่ำสุด: {p.minimum_stock} {p.unit}</p>
                  </div>
                  <div className="ml-2 text-right">
                    <span className={`text-lg font-bold ${p.current_stock === 0 ? 'text-red-500' : 'text-orange-500'}`}>{p.current_stock}</span>
                    <p className="text-xs text-gray-400">{p.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="ธุรกรรมสต็อกล่าสุด (10 รายการ)">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['วันที่', 'อะไหล่', 'ประเภท', 'จำนวน', 'หมายเหตุ'].map((h: any) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {(data?.transactions || []).map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2 px-3 text-xs text-gray-500">{t.created_at ? format(parseISO(t.created_at), 'd MMM yy', { locale: th }) : '-'}</td>
                    <td className="py-2 px-3 text-gray-900 dark:text-white font-medium truncate max-w-[140px]">{t.part?.name || '-'}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${t.transaction_type === 'IN' || t.transaction_type === 'Receive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-sm font-semibold text-gray-900 dark:text-white">{t.quantity}</td>
                    <td className="py-2 px-3 text-xs text-gray-500 truncate max-w-[120px]">{t.remark || '-'}</td>
                  </tr>
                ))}
                {!data?.transactions?.length && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">ยังไม่มีธุรกรรม</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ─── Requester Dashboard ─────────────────────────────────────────────────────

const RequesterDashboard: React.FC = () => {
  const { user } = useAuth();
  const today = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-requester', user?.id],
    queryFn: async () => {
      const { data: reqs, error } = await supabase
        .from('maintenance_requests')
        .select('id, request_number, title, status, priority, created_at, description')
        .eq('requester_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const requests = (reqs as any[]) || [];

      const submitted = requests.filter((r: any) => r.status === 'Submitted').length;
      const approved = requests.filter((r: any) => ['Approved', 'In Progress', 'Completed'].includes(r.status)).length;
      const rejected = requests.filter((r: any) => r.status === 'Rejected').length;

      return { requests, submitted, approved, rejected };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">แดชบอร์ดของฉัน</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">สวัสดี {user?.full_name || 'ผู้ใช้'}</p>
        </div>
        <Link
          to="/requests/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <ClipboardDocumentListIcon className="h-4 w-4" />
          ยื่นคำขอใหม่
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="รอการอนุมัติ" value={data?.submitted ?? 0} icon={<ClockIcon className="h-6 w-6" />} color="yellow" sub="Submitted" />
        <KpiCard title="อนุมัติแล้ว / กำลังดำเนินการ" value={data?.approved ?? 0} icon={<CheckCircleIcon className="h-6 w-6" />} color="green" sub="Approved / In Progress / Completed" />
        <KpiCard title="ถูกปฏิเสธ" value={data?.rejected ?? 0} icon={<ExclamationTriangleIcon className="h-6 w-6" />} color="red" sub="Rejected" />
      </div>

      <SectionCard
        title="คำขอของฉันทั้งหมด"
        action={<Link to="/requests" className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">ดูทั้งหมด <ArrowRightIcon className="h-3 w-3" /></Link>}
      >
        {isLoading ? (
          <div className="text-center py-8 text-gray-400 text-sm">กำลังโหลด...</div>
        ) : (data?.requests || []).length === 0 ? (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">ยังไม่มีคำขอ</p>
            <Link to="/requests/new" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
              ยื่นคำขอแรก
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  {['เลขที่คำขอ', 'หัวข้อ', 'ความเร่งด่วน', 'สถานะ', 'วันที่ยื่น'].map((h: any) => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {(data?.requests || []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-500">{r.request_number || `#${r.id?.slice(0, 8)}`}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                      <Link to={`/requests/${r.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">{r.title || '-'}</Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CLS[r.priority] || ''}`}>{r.priority || '-'}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLS[r.status] || ''}`}>{r.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">
                      {r.created_at ? format(parseISO(r.created_at), 'd MMM yy', { locale: th }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

// ─── Root: role-based router ─────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  if (role === 'admin' || role === 'supervisor') return <SupervisorDashboard />;
  if (role === 'technician') return <TechnicianDashboard />;
  if (role === 'store_keeper') return <StoreKeeperDashboard />;
  return <RequesterDashboard />;
};

export default DashboardPage;
