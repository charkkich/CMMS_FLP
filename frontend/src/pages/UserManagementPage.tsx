import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DataTable, { Column } from '../components/ui/DataTable';
import { User } from '../types';
import api from '../lib/api';
import toast from 'react-hot-toast';

const mockUsers: User[] = [
  { id: 1, username: 'admin', email: 'admin@cmms.com', full_name: 'System Admin', role: 'admin', department: 'IT', phone: '081-000-0001', is_active: true },
  { id: 2, username: 'supervisor1', email: 'sup@cmms.com', full_name: 'Tom Supervisor', role: 'supervisor', department: 'Engineering', phone: '081-000-0002', is_active: true },
  { id: 3, username: 'tech1', email: 'tech1@cmms.com', full_name: 'Mike Technician', role: 'technician', department: 'Maintenance', phone: '081-000-0003', is_active: true },
  { id: 4, username: 'tech2', email: 'tech2@cmms.com', full_name: 'Sara Mechanic', role: 'technician', department: 'Maintenance', phone: '081-000-0004', is_active: true },
  { id: 5, username: 'requester1', email: 'req@cmms.com', full_name: 'Alice Requester', role: 'requester', department: 'Operations', phone: '081-000-0005', is_active: false },
];

const roleColors: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  supervisor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  technician: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  requester: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data))
      .catch(() => setUsers(mockUsers))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (user: User) => {
    toast.error(`Delete user "${user.full_name}" — not implemented in demo`);
  };

  const columns: Column<User>[] = [
    {
      key: 'full_name',
      header: 'Full Name',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-600 dark:text-primary-400">
            {row.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">{row.full_name}</p>
            <p className="text-xs text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'username', header: t('auth.username') },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[row.role]}`}>
          {row.role}
        </span>
      ),
    },
    { key: 'department', header: 'Department' },
    { key: 'phone', header: 'Phone' },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.is_active
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
        }`}>
          {row.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('nav.userManagement')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{users.length} users</p>
        </div>
        <Button variant="primary" icon={<PlusIcon className="h-4 w-4" />}>
          {t('common.create')} User
        </Button>
      </div>

      <Card noPadding>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            keyExtractor={(row) => row.id}
            actions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          />
        </div>
      </Card>
    </div>
  );
};

export default UserManagementPage;
