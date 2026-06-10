import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import Header from './Header';

const routeTitles: Record<string, string> = {
  '/': 'nav.dashboard',
  '/requests': 'nav.maintenanceRequest',
  '/requests/new': 'nav.maintenanceRequest',
  '/work-orders': 'nav.workOrders',
  '/assets': 'nav.assetList',
  '/pm/schedule': 'nav.pmSchedule',
  '/pm/calendar': 'nav.pmCalendar',
  '/spare-parts': 'nav.spareParts',
  '/stock-transactions': 'nav.stockTransactions',
  '/reports': 'nav.reports',
  '/settings/users': 'nav.userManagement',
  '/settings/language': 'nav.languageSettings',
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();

  const titleKey =
    routeTitles[location.pathname] ||
    Object.keys(routeTitles).find((k) => location.pathname.startsWith(k) && k !== '/')
      ? routeTitles[
          Object.keys(routeTitles).find((k) => location.pathname.startsWith(k) && k !== '/') || '/'
        ]
      : 'nav.dashboard';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen(true)}
          pageTitle={t(titleKey || 'nav.dashboard')}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
