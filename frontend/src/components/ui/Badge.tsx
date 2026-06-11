import React from 'react';

type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';
type RequestStatus = 'Submitted' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Cancelled';
type WorkOrderStatus = 'Open' | 'Assigned' | 'In Progress' | 'Waiting Spare Part' | 'Completed' | 'Cancelled' | 'Closed';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'priority' | 'requestStatus' | 'workOrderStatus' | 'default';
  value?: string;
  className?: string;
}

const priorityColors: Record<PriorityLevel, string> = {
  Low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const requestStatusColors: Record<RequestStatus, string> = {
  Submitted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  Approved: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Rejected: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  'In Progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Completed: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  Cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const workOrderStatusColors: Record<WorkOrderStatus, string> = {
  Open: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  Assigned: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  'In Progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  'Waiting Spare Part': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  Completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  Closed: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export const PriorityBadge: React.FC<{ priority: PriorityLevel; label?: string }> = ({ priority, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[priority]}`}>
    {label || priority}
  </span>
);

export const RequestStatusBadge: React.FC<{ status: RequestStatus; label?: string }> = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${requestStatusColors[status]}`}>
    {label || status}
  </span>
);

export const WorkOrderStatusBadge: React.FC<{ status: WorkOrderStatus; label?: string }> = ({ status, label }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${workOrderStatusColors[status]}`}>
    {label || status}
  </span>
);

const Badge: React.FC<BadgeProps> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 ${className}`}>
    {children}
  </span>
);

export default Badge;
