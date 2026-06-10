import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  WrenchScrewdriverIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UsersIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  key: string;
  label: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  href?: string;
  children?: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    maintenance: true,
    assets: false,
    pm: false,
    inventory: false,
    settings: false,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navItems: NavItem[] = [
    { key: 'dashboard', label: t('nav.dashboard'), icon: HomeIcon, href: '/' },
    {
      key: 'maintenance',
      label: t('nav.maintenance'),
      icon: WrenchScrewdriverIcon,
      children: [
        { key: 'requests', label: t('nav.maintenanceRequest'), icon: DocumentTextIcon, href: '/requests' },
        { key: 'workOrders', label: t('nav.workOrders'), icon: ClipboardDocumentListIcon, href: '/work-orders' },
      ],
    },
    {
      key: 'assets',
      label: t('nav.assets'),
      icon: BuildingOfficeIcon,
      children: [
        { key: 'assetList', label: t('nav.assetList'), icon: BuildingOfficeIcon, href: '/assets' },
      ],
    },
    {
      key: 'pm',
      label: t('nav.preventiveMaintenance'),
      icon: CalendarIcon,
      children: [
        { key: 'pmSchedule', label: t('nav.pmSchedule'), icon: CalendarIcon, href: '/pm/schedule' },
        { key: 'pmCalendar', label: t('nav.pmCalendar'), icon: CalendarIcon, href: '/pm/calendar' },
      ],
    },
    {
      key: 'inventory',
      label: t('nav.inventory'),
      icon: ArchiveBoxIcon,
      children: [
        { key: 'spareParts', label: t('nav.spareParts'), icon: ArchiveBoxIcon, href: '/spare-parts' },
        { key: 'stockTransactions', label: t('nav.stockTransactions'), icon: DocumentTextIcon, href: '/stock-transactions' },
      ],
    },
    { key: 'reports', label: t('nav.reports'), icon: ChartBarIcon, href: '/reports' },
    {
      key: 'settings',
      label: t('nav.settings'),
      icon: Cog6ToothIcon,
      children: [
        { key: 'users', label: t('nav.userManagement'), icon: UsersIcon, href: '/settings/users' },
        { key: 'language', label: t('nav.languageSettings'), icon: Cog6ToothIcon, href: '/settings/language' },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 bg-primary-600 rounded-xl">
            <WrenchScrewdriverIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">CMMS</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-none">Maintenance System</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          if (item.href) {
            // Simple link
            return (
              <NavLink
                key={item.key}
                to={item.href}
                onClick={onClose}
                className={({ isActive: active }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
                end={item.href === '/'}
              >
                {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
                <span>{item.label}</span>
              </NavLink>
            );
          }

          // Group with children
          const groupOpen = openGroups[item.key];
          const hasActiveChild = item.children?.some((child) => child.href && isActive(child.href));

          return (
            <div key={item.key}>
              <button
                onClick={() => toggleGroup(item.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  hasActiveChild
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon && <item.icon className="w-5 h-5 flex-shrink-0" />}
                  <span>{item.label}</span>
                </div>
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform duration-200 ${groupOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {groupOpen && item.children && (
                <div className="ml-4 mt-1 space-y-0.5 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  {item.children.map((child) => (
                    <NavLink
                      key={child.key}
                      to={child.href!}
                      onClick={onClose}
                      className={({ isActive: active }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                          active
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        }`
                      }
                    >
                      {child.icon && <child.icon className="w-4 h-4 flex-shrink-0" />}
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">CMMS v1.0.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
