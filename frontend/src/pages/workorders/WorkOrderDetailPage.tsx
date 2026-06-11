import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { format } from 'date-fns';

const WorkOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: wo, isLoading } = useQuery({
    queryKey: ['work-order', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('work_orders')
        .select('*, asset:assets(name,asset_code,location), assignee:profiles!assigned_to(full_name)')
        .eq('id', id!).single();
      if (error) throw error; return data;
    }, enabled: !!id,
  });

  const complete = async () => {
    setSaving(true);
    const { error } = await supabase.from('work_orders').update({
      status:'Completed', actual_end: new Date().toISOString(),
      actual_hours: hours ? parseFloat(hours) : null, completion_notes: notes,
    }).eq('id', id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Work order completed!'); setModal(false); qc.invalidateQueries({ queryKey: ['work-order', id] });
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!wo) return <div className="text-center py-20 text-gray-500">Not found</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/work-orders')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeftIcon className="h-5 w-5" /></button>
        <div className="flex-1"><h1 className="text-xl font-bold text-gray-900 dark:text-white">{wo.title}</h1><p className="text-sm text-gray-500 font-mono">{wo.wo_number||`#${wo.id}`}</p></div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${wo.type==='Preventive'?'bg-teal-100 text-teal-700':'bg-amber-100 text-amber-700'}`}>{wo.type}</span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${wo.status==='Completed'?'bg-green-100 text-green-700':wo.status==='In Progress'?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600'}`}>{wo.status}</span>
      </div>
      <Card title="Details">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[['Asset',(wo as any).asset?.name||'—'],['Location',(wo as any).asset?.location||'—'],['Assigned To',(wo as any).assignee?.full_name||'Unassigned'],['Priority',wo.priority],['Est. Hours',wo.estimated_hours??'—'],['Actual Hours',wo.actual_hours??'—']].map(([l,v]) => (
            <div key={l as string}><dt className="text-xs font-semibold text-gray-500 uppercase">{l}</dt><dd className="mt-1 text-gray-900 dark:text-white">{v as string}</dd></div>
          ))}
          {wo.description && <div className="col-span-2"><dt className="text-xs font-semibold text-gray-500 uppercase">Description</dt><dd className="mt-1 text-gray-700 dark:text-gray-300">{wo.description}</dd></div>}
          {wo.completion_notes && <div className="col-span-2"><dt className="text-xs font-semibold text-green-600 uppercase">Completion Notes</dt><dd className="mt-1 text-gray-700 dark:text-gray-300">{wo.completion_notes}</dd></div>}
        </dl>
      </Card>
      {user?.role !== 'requester' && !['Completed','Cancelled'].includes(wo.status) && (
        <Button icon={<CheckCircleIcon className="h-4 w-4" />} onClick={() => setModal(true)}>Mark as Completed</Button>
      )}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Complete Work Order"
        footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button loading={saving} onClick={complete}>Confirm</Button></>}>
        <div className="space-y-4">
          <div><label className="form-label">Actual Hours</label><input type="number" step="0.5" className="input-field" value={hours} onChange={e => setHours(e.target.value)} placeholder="e.g. 2.5" /></div>
          <div><label className="form-label">Completion Notes</label><textarea rows={3} className="input-field resize-none" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was done?" /></div>
        </div>
      </Modal>
    </div>
  );
};
export default WorkOrderDetailPage;
