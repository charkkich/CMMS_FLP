import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Requests
import RequestListPage from './pages/requests/RequestListPage';
import RequestFormPage from './pages/requests/RequestFormPage';
import RequestDetailPage from './pages/requests/RequestDetailPage';

// Work Orders
import WorkOrderListPage from './pages/workorders/WorkOrderListPage';
import WorkOrderDetailPage from './pages/workorders/WorkOrderDetailPage';
import WorkOrderFormPage from './pages/workorders/WorkOrderFormPage';

// Assets
import AssetListPage from './pages/assets/AssetListPage';
import AssetFormPage from './pages/assets/AssetFormPage';
import AssetDetailPage from './pages/assets/AssetDetailPage';

// PM
import PMSchedulePage from './pages/pm/PMSchedulePage';
import PMCalendarPage from './pages/pm/PMCalendarPage';

// Inventory
import SparePartListPage from './pages/inventory/SparePartListPage';
import SparePartFormPage from './pages/inventory/SparePartFormPage';
import StockTransactionPage from './pages/inventory/StockTransactionPage';

// Reports
import ReportsPage from './pages/reports/ReportsPage';

// Inventory (extended)
import SparePartApprovalPage from './pages/inventory/SparePartApprovalPage';

// Settings
import UserManagementPage from './pages/settings/UserManagementPage';
import LanguageSettingsPage from './pages/settings/LanguageSettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Initialize dark mode from localStorage
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* Dashboard */}
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      {/* Maintenance Requests */}
      <Route path="/requests" element={<ProtectedRoute><RequestListPage /></ProtectedRoute>} />
      <Route path="/requests/new" element={<ProtectedRoute><RequestFormPage /></ProtectedRoute>} />
      <Route path="/requests/:id" element={<ProtectedRoute><RequestDetailPage /></ProtectedRoute>} />

      {/* Work Orders */}
      <Route path="/work-orders" element={<ProtectedRoute><WorkOrderListPage /></ProtectedRoute>} />
      <Route path="/work-orders/new" element={<ProtectedRoute><WorkOrderFormPage /></ProtectedRoute>} />
      <Route path="/work-orders/:id" element={<ProtectedRoute><WorkOrderDetailPage /></ProtectedRoute>} />
      <Route path="/work-orders/:id/edit" element={<ProtectedRoute><WorkOrderFormPage /></ProtectedRoute>} />

      {/* Assets */}
      <Route path="/assets" element={<ProtectedRoute><AssetListPage /></ProtectedRoute>} />
      <Route path="/assets/new" element={<ProtectedRoute><AssetFormPage /></ProtectedRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />
      <Route path="/assets/:id/edit" element={<ProtectedRoute><AssetFormPage /></ProtectedRoute>} />

      {/* PM */}
      <Route path="/pm/schedule" element={<ProtectedRoute><PMSchedulePage /></ProtectedRoute>} />
      <Route path="/pm/calendar" element={<ProtectedRoute><PMCalendarPage /></ProtectedRoute>} />

      {/* Inventory */}
      <Route path="/spare-parts" element={<ProtectedRoute><SparePartListPage /></ProtectedRoute>} />
      <Route path="/spare-parts/new" element={<ProtectedRoute><SparePartFormPage /></ProtectedRoute>} />
      <Route path="/spare-parts/:id/edit" element={<ProtectedRoute><SparePartFormPage /></ProtectedRoute>} />
      <Route path="/stock-transactions" element={<ProtectedRoute><StockTransactionPage /></ProtectedRoute>} />

      {/* Reports */}
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

      {/* Spare Part Approvals (Store Keeper) */}
      <Route path="/spare-part-approvals" element={<ProtectedRoute><SparePartApprovalPage /></ProtectedRoute>} />

      {/* Settings */}
      <Route
        path="/settings/users"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <UserManagementPage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route path="/settings/language" element={<ProtectedRoute><LanguageSettingsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--toast-bg, #1f2937)',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#22c55e', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
