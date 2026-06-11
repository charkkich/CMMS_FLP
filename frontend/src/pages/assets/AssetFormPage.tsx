import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

interface F { asset_code:string; name:string; category:string; location:string; status:string; serial_number:string; model:string; manufacturer:string; purchase_date:string; warranty_expiry:string; purchase_cost:string; description:string; }
const CATS = ['Pump','Compressor','Generator','HVAC','Vehicle','Electrical','Conveyor','Other'];

const AssetFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<F>({ defaultValues: { status:'Active' } });
  useEffect(() => {
    if (isEdit) supabase.from('assets').select('*').eq('id',id!).single().then(({ data }: any) => { if (data) reset({ ...data, purchase_cost: data.purchase_cost?.toString()||'' }); });
  }, [id, isEdit, reset]);
  const onSubmit = async (data: F) => {
    const payload = { ...data, purchase_cost: data.purchase_cost ? parseFloat(data.purchase_cost) : null };
    try {
      if (isEdit) { const { error } = await supabase.from('assets').update(payload).eq('id',id!); if (error) throw error; toast.success('Updated'); }
      else { const { error } = await supabase.from('assets').insert(payload); if (error) throw error; toast.success('Created'); }
      navigate('/assets');
    } catch (err: any) { toast.error(err.message); }
  };
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit?'Edit Asset':'Add Asset'}</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Code *</label><input {...register('asset_code',{required:true})} className="input-field" placeholder="AST-001" /></div>
            <div><label className="form-label">Name *</label><input {...register('name',{required:true})} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Category</label><select {...register('category')} className="input-field">{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label className="form-label">Status</label><select {...register('status')} className="input-field"><option>Active</option><option>Under Maintenance</option><option>Inactive</option><option>Disposed</option></select></div>
          </div>
          <div><label className="form-label">Location</label><input {...register('location')} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Manufacturer</label><input {...register('manufacturer')} className="input-field" /></div>
            <div><label className="form-label">Model</label><input {...register('model')} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="form-label">Purchase Date</label><input type="date" {...register('purchase_date')} className="input-field" /></div>
            <div><label className="form-label">Purchase Cost (฿)</label><input type="number" {...register('purchase_cost')} className="input-field" /></div>
          </div>
          <div><label className="form-label">Description</label><textarea {...register('description')} rows={2} className="input-field resize-none" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => navigate('/assets')}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>{isEdit?'Save Changes':'Create Asset'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
export default AssetFormPage;
