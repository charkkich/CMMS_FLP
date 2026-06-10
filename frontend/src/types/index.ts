export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'supervisor' | 'technician' | 'requester';
  department?: string;
  phone?: string;
  is_active?: boolean;
}

export interface Asset {
  id: number;
  asset_id: string;
  asset_name: string;
  category: string;
  location?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  purchase_date?: string;
  warranty_expiry?: string;
  status: string;
  description?: string;
}

export interface MaintenanceRequest {
  id: number;
  request_number: string;
  request_date: string;
  requester_id: number;
  requester_name?: string;
  department?: string;
  location?: string;
  asset_id?: number;
  asset_name?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  problem_description: string;
  status: 'Submitted' | 'Approved' | 'Rejected' | 'Converted to Work Order';
  photos?: string[];
  rejection_reason?: string;
}

export interface WorkOrder {
  id: number;
  wo_number: string;
  request_id?: number;
  asset_id?: number;
  asset_name?: string;
  assigned_technician?: number;
  technician_name?: string;
  title: string;
  work_description?: string;
  start_date?: string;
  due_date?: string;
  completion_date?: string;
  root_cause?: string;
  corrective_action?: string;
  labor_hours?: number;
  status: 'Open' | 'In Progress' | 'Waiting Spare Part' | 'Completed' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  type: 'Corrective' | 'Preventive';
}

export interface PmPlan {
  id: number;
  pm_code: string;
  asset_id: number;
  asset_name?: string;
  title: string;
  frequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
  responsible_person?: number;
  responsible_name?: string;
  checklist: { item: string; required: boolean }[];
  next_due_date?: string;
  last_completed_date?: string;
  is_active: boolean;
}

export interface SparePart {
  id: number;
  part_number: string;
  part_name: string;
  category?: string;
  unit?: string;
  current_stock: number;
  minimum_stock: number;
  storage_location?: string;
  unit_cost?: number;
}

export interface StockTransaction {
  id: number;
  part_id: number;
  part_name?: string;
  transaction_date: string;
  transaction_type: 'Receive' | 'Issue' | 'Adjustment';
  quantity: number;
  reference_number?: string;
  remark?: string;
  balance_after: number;
}
