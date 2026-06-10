import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface RequestForm {
  location: string;
  asset_name: string;
  priority: string;
  problem_description: string;
  department: string;
}

const CreateRequestPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RequestForm>();

  const onSubmit = async (data: RequestForm) => {
    setLoading(true);
    try {
      await api.post('/maintenance-requests', data);
      toast.success('Request created successfully');
      navigate('/requests');
    } catch {
      toast.error('Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('request.createNew')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Fill in the details below to submit a maintenance request.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('request.department')}
              </label>
              <input
                {...register('department', { required: 'Required' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Operations"
              />
              {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('request.location')}
              </label>
              <input
                {...register('location', { required: 'Required' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Building A, Floor 2"
              />
              {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('request.asset')}
              </label>
              <input
                {...register('asset_name')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Pump A"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t('request.priority')}
              </label>
              <select
                {...register('priority', { required: 'Required' })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select priority</option>
                {['Low', 'Medium', 'High', 'Critical'].map((p) => (
                  <option key={p} value={p}>{t(`request.priorities.${p}`)}</option>
                ))}
              </select>
              {errors.priority && <p className="mt-1 text-xs text-red-500">{errors.priority.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('request.problemDescription')}
            </label>
            <textarea
              {...register('problem_description', { required: 'Required' })}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Describe the problem in detail..."
            />
            {errors.problem_description && (
              <p className="mt-1 text-xs text-red-500">{errors.problem_description.message}</p>
            )}
          </div>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-primary-400 transition-colors cursor-pointer">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('request.photoUpload')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG up to 10MB</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/requests')}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {t('common.submit')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateRequestPage;
