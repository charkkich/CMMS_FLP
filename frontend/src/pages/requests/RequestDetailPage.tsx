import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { format } from 'date-fns';

const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [rejectModal, setRejectModal] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: req, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('maintenance_requests')
        .select('*, requester:profiles!requester_id(full_name), asset:assets(name,asset_code,location)')
        .eq('id', id!).single();
      if (error) throw error; return data;
    }, enabled: !!id,
  });

  const canApprove = user?.role === 'admin' || user?.role === 'supervisor';

  const approve = async () => {
    setSaving(true);
    const { error } = await supabase.from('maintenance_requests').update({ status:'Approved', approved_by: user?.id }).eq('id', id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Approved — work order created'); qc.invalidateQueries({ queryKey: ['request', id] });
  };
  const reject = async () => {
    setSaving(true);
    const { error } = await supabase.from('maintenance_requests').update({ status:'Rejected', rejection_reason: reason }).eq('id', id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Rejected'); setRejectModal(false); qc.invalidateQueries({ queryKey: ['request', id] });
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!req) return <div className="text-center py-20 text-gray-500">Not found</div>;

  const PRIORITY_CLS: Record<string,string> = { Low:'bg-gray-100 text-gray-600', Medium:'bg-amber-100 text-amber-700', High:'bg-orange-100 text-orange-700', Critical:'bg-red-100 text-red-700' };
  const STATUS_CLS: Record<string,string> = { Submitted:'bg-blue-100 text-blue-700', Approved:'bg-teal-100 text-teal-700', Rejected:'bg-red-100 text-red-700', 'In Progress':'bg-purple-100 text-purple-700', Completed:'bg-green-100 text-green-700', Cancelled:'bg-gray-100 text-gray-600' };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/requests')} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeftIcon className="h-5 w-5" /></button>
        <div className="flex-1"><h1 className="text-xl font-bold text-gray-900 dark:text-white">{req.title}</h1><p className="text-sm text-gray-500 font-mono">{req.request_number||`#${req.id}`}</p></div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PRIORITY_CLS[req.priority]||''}`}>{req.priority}</span>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[req.status]||''}`}>{req.status}</span>
      </div>
      <Card title="Request Details">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[['Requester', (req as any).requester?.full_name||'—'],['Submitted', format(new Date(req.created_at),'dd MMM yyyy HH:mm')],['Asset',(req as any).asset?.name||'—'],['Location', req.location||'—']].map(([l,v]) => (
            <div key={l}><dt className="text-xs font-semibold text-gray-500 uppercase">{l}</dt><dd className="mt-1 text-gray-900 dark:text-white">{v}</dd></div>
          ))}
          {req.description && <div className="col-span-2"><dt className="text-xs font-semibold text-gray-500 uppercase">Description</dt><dd className="mt-1 text-gray-700 dark:text-gray-300">{req.description}</dd></div>}
          {req.rejection_reason && <div className="col-span-2"><dt className="text-xs font-semibold text-red-500 uppercase">Rejection Reason</dt><dd className="mt-1 text-red-700">{req.rejection_reason}</dd></div>}
        </dl>
      </Card>
      {canApprove && req.status === 'Submitted' && (
        <div className="flex gap-3">
          <Button icon={<CheckCircleIcon className="h-4 w-4" />} loading={saving} onClick={approve}>Approve</Button>
          <Button variant="danger" icon={<XCircleIcon className="h-4 w-4" />} onClick={() => setRejectModal(true)}>Reject</Button>
        </div>
      )}
      <Modal isOpen={rejectModal} onClose={() => setRejectModal(false)} title="Reject Request"
        footer={<><Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button><Button variant="danger" loading={saving} onClick={reject}>Confirm Reject</Button></>}>
        <div><label className="form-label">Reason</label>
          <textarea rows={3} className="input-field resize-none" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why is this being rejected?" /></div>
      </Modal>
    </div>
  );
};
export default RequestDetailPage;
