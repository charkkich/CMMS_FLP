import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PlusIcon, UserIcon } from '@heroicons/react/24/outline';

const ROLE_LABELS: Record<string, string> = { admin: 'ผู้ดูแลระบบ', supervisor: 'หัวหน้างาน', technician: 'ช่างเทคนิค', store_keeper: 'คลังพัสดุ', requester: 'ผู้แจ้งซ่อม' };
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  supervisor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  technician: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  store_keeper: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  requester: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function UserManagementPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data: users = [], isLoading } = useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: async () => { const { data } = await supabase.from('profiles').select('*').order('full_name'); return (data as any[]) || []; }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await (supabase.auth as any).signUp({ email: values.email, password: values.password, options: { data: { full_name: values.full_name, role: values.role } } });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profiles'] }); toast.success('เพิ่มผู้ใช้สำเร็จ'); setShowModal(false); reset(); },
    onError: (e: any) => toast.error(e.message)
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_active: !is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['profiles'] }); toast.success('อัปเดตสถานะสำเร็จ'); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการผู้ใช้งาน</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <PlusIcon className="h-4 w-4" /> เพิ่มผู้ใช้
        </button>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{users.filter((u: Profile) => u.role === role).length}</p>
          </div>
        ))}
      </div>
      {isLoading ? <div className="text-center py-8 text-gray-500">กำลังโหลด...</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {['ผู้ใช้งาน','บทบาท','แผนก','โทรศัพท์','สถานะ','การดำเนินการ'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((u: Profile) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                        <p className="text-xs text-gray-500">{u.username || u.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.department || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{u.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive.mutate({ id: u.id, is_active: u.is_active })} className="text-xs text-blue-600 hover:underline">
                      {u.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">เพิ่มผู้ใช้ใหม่</h2>
            <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อ-นามสกุล *</label>
                <input {...register('full_name', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">อีเมล *</label>
                <input type="email" {...register('email', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสผ่าน *</label>
                <input type="password" {...register('password', { required: true, minLength: 6 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">บทบาท *</label>
                <select {...register('role', { required: true })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setShowModal(false); reset(); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">ยกเลิก</button>
                <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{mutation.isPending ? '...' : 'บันทึก'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
