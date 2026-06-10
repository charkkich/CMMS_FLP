import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { User } from '../../types';

interface UserFormData {
  full_name: string;
  username: string;
  email: string;
  password?: string;
  role: string;
  department: string;
  phone: string;
}

const roleBadge: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  supervisor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  technician: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  requester: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; editing: User | null }>({ open: false, editing: null });
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    defaultValues: { role: 'requester' },
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      const data = res.data;
      setUsers(Array.isArray(data) ? data : data.data || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    reset({ role: 'requester', full_name: '', username: '', email: '', password: '', department: '', phone: '' });
    setModal({ open: true, editing: null });
  };

  const openEdit = (u: User) => {
    reset({
      full_name: u.full_name,
      username: u.username,
      email: u.email,
      role: u.role,
      department: u.department || '',
      phone: u.phone || '',
    });
    setModal({ open: true, editing: u });
  };

  const onSave = async (data: UserFormData) => {
    setSaving(true);
    try {
      if (modal.editing) {
        const payload: Partial<UserFormData> = { ...data };
        if (!payload.password) delete payload.password;
        await api.put(`/users/${modal.editing.id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/users', data);
        toast.success('User created');
      }
      setModal({ open: false, editing: null });
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: User) => {
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      toast.success(`User ${u.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.userManagement')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{users.length} users</p>
        </div>
        <Button icon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
          Create User
        </Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {['Full Name', 'Username', 'Email', 'Role', 'Department', 'Status', t('common.actions')].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">{t('common.noData')}</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{u.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadge[u.role] || 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.department || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${u.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(u)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Edit">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        {currentUser?.id !== u.id && (
                          <button
                            onClick={() => toggleActive(u)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                              u.is_active !== false
                                ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                            }`}
                          >
                            {u.is_active !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        title={modal.editing ? 'Edit User' : 'Create User'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal({ open: false, editing: null })}>{t('common.cancel')}</Button>
            <Button loading={saving} onClick={handleSubmit(onSave)}>{t('common.save')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Full Name <span className="text-red-500">*</span></label>
              <input type="text" {...register('full_name', { required: true })} className="input-field" />
            </div>
            <div>
              <label className="form-label">Username <span className="text-red-500">*</span></label>
              <input type="text" {...register('username', { required: true })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="form-label">Email <span className="text-red-500">*</span></label>
            <input type="email" {...register('email', { required: true })} className="input-field" />
          </div>
          <div>
            <label className="form-label">{modal.editing ? 'New Password (leave blank to keep)' : 'Password'} {!modal.editing && <span className="text-red-500">*</span>}</label>
            <input type="password" {...register('password', { required: !modal.editing })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Role</label>
              <select {...register('role')} className="input-field">
                <option value="admin">Admin</option>
                <option value="supervisor">Supervisor</option>
                <option value="technician">Technician</option>
                <option value="requester">Requester</option>
              </select>
            </div>
            <div>
              <label className="form-label">Department</label>
              <input type="text" {...register('department')} className="input-field" />
            </div>
          </div>
          <div>
            <label className="form-label">Phone</label>
            <input type="text" {...register('phone')} className="input-field" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
