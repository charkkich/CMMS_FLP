import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

interface FormData { title: string; description: string; asset_id: string; custom_asset: string; location: string; priority: string; }

const RequestFormPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState('');
  const { register, handleSubmit, formState: { isSubmitting }, setValue } = useForm<FormData>({ defaultValues: { priority: 'Medium' } });

  useEffect(() => {
    supabase.from('assets').select('id, name, asset_code').eq('status','Active').order('name').then(({ data }: any) => setAssets(data||[]));
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    try {
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const seq = String(Math.floor(Math.random() * 9000) + 1000);
      const request_number = `REQ-${yyyy}${mm}-${seq}`;
      const { error } = await supabase.from('maintenance_requests').insert({
        request_number,
        title: data.title,
        description: data.description || null,
        asset_id: data.asset_id && data.asset_id !== 'other' ? Number(data.asset_id) : null,
        location: data.asset_id === 'other' && data.custom_asset ? data.custom_asset : (data.location || null),
        priority: data.priority,
        status: 'Submitted',
        requester_id: user.id,
        photo_urls: [],
      });
      if (error) throw error;
      toast.success('ส่งคำขอซ่อมบำรุงสำเร็จ');
      navigate('/requests');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">แจ้งซ่อมบำรุงใหม่</h1></div>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">หัวข้อ <span className="text-red-500">*</span></label>
            <input {...register('title',{required:true})} className="input-field" placeholder="อธิบายปัญหาโดยย่อ" />
          </div>
          <div>
            <label className="form-label">รายละเอียด</label>
            <textarea {...register('description')} rows={3} className="input-field resize-none" placeholder="รายละเอียดเพิ่มเติม..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">เครื่องจักร/อุปกรณ์</label>
              <select {...register('asset_id')} className="input-field" onChange={e => { setValue('asset_id', e.target.value); setSelectedAsset(e.target.value); }}>
                <option value="">-- เลือกเครื่องจักร --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.name}</option>)}
                <option value="other">อื่นๆ (ระบุเอง)</option>
              </select>
              {selectedAsset === 'other' && (
                <input {...register('custom_asset', { required: selectedAsset === 'other' })} className="input-field mt-2" placeholder="ระบุชื่อเครื่องจักร/อุปกรณ์..." />
              )}
            </div>
            <div>
              <label className="form-label">ความสำคัญ</label>
              <select {...register('priority')} className="input-field">
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">สถานที่</label>
            <input {...register('location')} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/requests')}>ยกเลิก</Button>
            <Button type="submit" loading={isSubmitting}>ส่งคำขอ</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
export default RequestFormPage;
