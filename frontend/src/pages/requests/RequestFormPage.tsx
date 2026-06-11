import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

interface FormData { title: string; description: string; asset_id: string; location: string; priority: string; }

const RequestFormPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<any[]>([]);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({ defaultValues: { priority: 'Medium' } });

  useEffect(() => {
    supabase.from('assets').select('id, name, asset_code').eq('status','Active').order('name').then(({ data }: any) => setAssets(data||[]));
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('maintenance_requests').insert({
        title: data.title, description: data.description,
        asset_id: data.asset_id ? Number(data.asset_id) : null,
        location: data.location, priority: data.priority,
        requester_id: user.id, photo_urls: [],
      });
      if (error) throw error;
      toast.success('Request submitted!');
      navigate('/requests');
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Maintenance Request</h1></div>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">Title <span className="text-red-500">*</span></label>
            <input {...register('title',{required:true})} className="input-field" placeholder="Brief description of the issue" />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea {...register('description')} rows={3} className="input-field resize-none" placeholder="More details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Asset</label>
              <select {...register('asset_id')} className="input-field">
                <option value="">-- Select Asset --</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select {...register('priority')} className="input-field">
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Location</label>
            <input {...register('location')} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/requests')}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Submit Request</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
export default RequestFormPage;
