import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<Props> = ({
  open, title, message, confirmLabel = 'ยืนยัน', cancelLabel = 'ยกเลิก',
  variant = 'danger', onConfirm, onCancel
}) => {
  if (!open) return null;
  const btnColor = variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : variant === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-blue-600 hover:bg-blue-700';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <ExclamationTriangleIcon className={`h-5 w-5 ${variant === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${btnColor}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
