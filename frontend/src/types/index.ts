export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  role: 'admin' | 'supervisor' | 'technician' | 'requester';
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type User = Profile;

export interface Asset {
  id: number;
  asset_code: string;
  name: string;
  category: string;
  location: string | null;
  status: 'Active' | 'Under Maintenance' | 'Inactive' | 'Disposed';
  serial_number: string | null;
  model: string | null;
  manufacturer: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  purchase_cost: number | null;
  description: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: number;
  request_number: string | null;
  title: string;
  description: string | null;
  asset_id: number | null;
  location: string | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Submitted' | 'Approved' | 'Rejected' | 'In Progress' | 'Completed' | 'Cancelled';
  requester_id: string;
  approved_by: string | null;
  photo_urls: string[];
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  requester?: { full_name: string } | null;
  asset?: { name: string; asset_code: string } | null;
}

export interface WorkOrder {
  id: number;
  wo_number: string | null;
  title: string;
  description: string | null;
  type: 'Corrective' | 'Preventive';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled';
  asset_id: number | null;
  request_id: number | null;
  assigned_to: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  labor_cost: number | null;
  parts_cost: number | null;
  notes: string | null;
  completion_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  asset?: { name: string; asset_code: string } | null;
  assignee?: { full_name: string } | null;
}

export interface PmPlan {
  id: number;
  plan_number: string | null;
  title: string;
  description: string | null;
  asset_id: number | null;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual';
  estimated_duration: number;
  assigned_to: string | null;
  last_performed_date: string | null;
  next_due_date: string;
  is_active: boolean;
  checklist: string[];
  created_at: string;
  updated_at: string;
  asset?: { name: string; asset_code: string } | null;
  assignee?: { full_name: string } | null;
}

export interface SparePart {
  id: number;
  part_code: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  maximum_stock: number | null;
  unit_cost: number | null;
  location: string | null;
  supplier: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: number;
  part_id: number;
  transaction_type: 'Receive' | 'Issue' | 'Adjustment' | 'Return';
  quantity: number;
  balance_after: number;
  reference_number: string | null;
  wo_id: number | null;
  performed_by: string | null;
  remark: string | null;
  transaction_date: string;
  part?: { name: string; part_code: string } | null;
}
