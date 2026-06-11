// ─────────────────────────────────────────────────────────────────────────────
// DEMO MOCK — full in-memory Supabase client (no real backend needed)
// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_ID = 'a0000000-0000-0000-0000-000000000001';
const SUP_ID   = 'a0000000-0000-0000-0000-000000000002';
const TECH_ID  = 'a0000000-0000-0000-0000-000000000003';
const REQ_ID   = 'a0000000-0000-0000-0000-000000000004';

const iso = (daysAgo = 0) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const dateStr = (daysFromNow = 0) => {
  const d = new Date(); d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
};

type AnyRow = Record<string, any>;
type DB = Record<string, AnyRow[]>;

const db: DB = {
  profiles: [
    { id: ADMIN_ID, full_name: 'System Admin',    username: 'admin',      role: 'admin',      department: 'Management', phone: null, avatar_url: null, is_active: true, created_at: iso(90), updated_at: iso() },
    { id: SUP_ID,   full_name: 'John Supervisor',  username: 'supervisor', role: 'supervisor', department: 'Maintenance',phone: null, avatar_url: null, is_active: true, created_at: iso(90), updated_at: iso() },
    { id: TECH_ID,  full_name: 'Mike Technician',  username: 'tech1',      role: 'technician', department: 'Maintenance',phone: null, avatar_url: null, is_active: true, created_at: iso(90), updated_at: iso() },
    { id: REQ_ID,   full_name: 'Sara Requester',   username: 'sara',       role: 'requester',  department: 'Operations', phone: null, avatar_url: null, is_active: true, created_at: iso(90), updated_at: iso() },
  ],
  assets: [
    { id: 1, asset_code: 'AST-001', name: 'Water Pump #1',         category: 'Pump',       location: 'Building A - Floor 1', status: 'Active',            manufacturer: 'Grundfos',    model: 'CM5-7',     purchase_date: '2022-01-15', warranty_expiry: '2025-01-15', purchase_cost: 45000,  description: 'Main water supply pump', photo_url: null, created_at: iso(500), updated_at: iso() },
    { id: 2, asset_code: 'AST-002', name: 'Air Compressor',        category: 'Compressor', location: 'Workshop',            status: 'Active',            manufacturer: 'Atlas Copco', model: 'GA15',      purchase_date: '2021-06-20', warranty_expiry: '2024-06-20', purchase_cost: 280000, description: null, photo_url: null, created_at: iso(500), updated_at: iso() },
    { id: 3, asset_code: 'AST-003', name: 'Generator 200KVA',      category: 'Generator',  location: 'Building B',          status: 'Active',            manufacturer: 'Cummins',     model: 'C200D5',    purchase_date: '2020-03-10', warranty_expiry: null,         purchase_cost: 850000, description: 'Emergency backup generator', photo_url: null, created_at: iso(500), updated_at: iso() },
    { id: 4, asset_code: 'AST-004', name: 'HVAC Unit Roof A',      category: 'HVAC',       location: 'Rooftop A',           status: 'Active',            manufacturer: 'Carrier',     model: '30XA-200',  purchase_date: '2021-09-01', warranty_expiry: '2024-09-01', purchase_cost: 380000, description: null, photo_url: null, created_at: iso(500), updated_at: iso() },
    { id: 5, asset_code: 'AST-005', name: 'Forklift Toyota 2.5T',  category: 'Vehicle',    location: 'Warehouse',           status: 'Active',            manufacturer: 'Toyota',      model: '8FD25',     purchase_date: '2023-02-28', warranty_expiry: '2026-02-28', purchase_cost: 520000, description: null, photo_url: null, created_at: iso(500), updated_at: iso() },
    { id: 6, asset_code: 'AST-006', name: 'Fire Pump',             category: 'Pump',       location: 'Fire Room',           status: 'Active',            manufacturer: 'Grundfos',    model: 'NK 65-200', purchase_date: '2019-11-05', warranty_expiry: null,         purchase_cost: 180000, description: null, photo_url: null, created_at: iso(500), updated_at: iso() },
    { id: 7, asset_code: 'AST-007', name: 'Main Electrical Panel', category: 'Electrical', location: 'MDB Room',            status: 'Active',            manufacturer: 'Schneider',   model: 'Okken',     purchase_date: '2018-07-22', warranty_expiry: null,         purchase_cost: 650000, description: null, photo_url: null, created_at: iso(500), updated_at: iso() },
    { id: 8, asset_code: 'AST-008', name: 'Cooling Tower',         category: 'HVAC',       location: 'Rooftop B',           status: 'Under Maintenance', manufacturer: 'Baltimore',   model: 'VXT-100',   purchase_date: '2020-05-14', warranty_expiry: null,         purchase_cost: 320000, description: null, photo_url: null, created_at: iso(500), updated_at: iso() },
  ],
  maintenance_requests: [
    { id: 1, request_number: 'MR-202412-0001', title: 'Water pump making noise',     description: 'Unusual vibration and grinding noise from pump #1', asset_id: 1, location: 'Building A', priority: 'High',     status: 'Submitted',   requester_id: REQ_ID,  approved_by: null, photo_urls: [], rejection_reason: null, created_at: iso(2),  updated_at: iso(2),  requester: { full_name: 'Sara Requester' },  asset: { name: 'Water Pump #1',         asset_code: 'AST-001' } },
    { id: 2, request_number: 'MR-202412-0002', title: 'AC not cooling properly',     description: 'HVAC unit not reaching the set temperature of 24°C', asset_id: 4, location: 'Rooftop A', priority: 'Medium',   status: 'Approved',    requester_id: REQ_ID,  approved_by: SUP_ID,   photo_urls: [], rejection_reason: null, created_at: iso(5),  updated_at: iso(4),  requester: { full_name: 'Sara Requester' },  asset: { name: 'HVAC Unit Roof A',       asset_code: 'AST-004' } },
    { id: 3, request_number: 'MR-202412-0003', title: 'Generator low oil warning',   description: 'Oil pressure warning light on the generator dashboard', asset_id: 3, location: 'Building B', priority: 'High',  status: 'In Progress', requester_id: SUP_ID,  approved_by: SUP_ID,   photo_urls: [], rejection_reason: null, created_at: iso(7),  updated_at: iso(6),  requester: { full_name: 'John Supervisor' }, asset: { name: 'Generator 200KVA',       asset_code: 'AST-003' } },
    { id: 4, request_number: 'MR-202412-0004', title: 'Forklift hydraulic oil leak', description: 'Slow leak from the hydraulic cylinder seal',            asset_id: 5, location: 'Warehouse', priority: 'Medium', status: 'Completed',   requester_id: REQ_ID,  approved_by: SUP_ID,   photo_urls: [], rejection_reason: null, created_at: iso(14), updated_at: iso(10), requester: { full_name: 'Sara Requester' },  asset: { name: 'Forklift Toyota 2.5T',   asset_code: 'AST-005' } },
    { id: 5, request_number: 'MR-202412-0005', title: 'Electrical panel humming',    description: 'Loud humming noise from the main distribution board',   asset_id: 7, location: 'MDB Room',  priority: 'Critical',status: 'Submitted',   requester_id: TECH_ID, approved_by: null,     photo_urls: [], rejection_reason: null, created_at: iso(1),  updated_at: iso(1),  requester: { full_name: 'Mike Technician' }, asset: { name: 'Main Electrical Panel',  asset_code: 'AST-007' } },
    { id: 6, request_number: 'MR-202411-0006', title: 'Cooling tower fan vibration', description: 'Excessive vibration on cooling tower fan motor',         asset_id: 8, location: 'Rooftop B', priority: 'Medium', status: 'Rejected',    requester_id: REQ_ID,  approved_by: null,     photo_urls: [], rejection_reason: 'Duplicate request — covered by scheduled maintenance', created_at: iso(20), updated_at: iso(19), requester: { full_name: 'Sara Requester' }, asset: { name: 'Cooling Tower', asset_code: 'AST-008' } },
  ],
  work_orders: [
    { id: 1, wo_number: 'WO-202412-0001', title: 'AC System Repair',                   description: 'Fix HVAC cooling issue — check refrigerant and coils',  type: 'Corrective',  priority: 'Medium',   status: 'In Progress', asset_id: 4, request_id: 2, assigned_to: TECH_ID, created_by: SUP_ID,  scheduled_start: iso(3), scheduled_end: iso(2), actual_start: iso(3), actual_end: null,    estimated_hours: 4,   actual_hours: null, labor_cost: null, parts_cost: null, notes: null, completion_notes: null, created_at: iso(4), updated_at: iso(3), asset: { name: 'HVAC Unit Roof A',      asset_code: 'AST-004' }, assignee: { full_name: 'Mike Technician' } },
    { id: 2, wo_number: 'WO-202412-0002', title: 'Generator Oil Change & Inspection',  description: 'Change engine oil, check all fluid levels',              type: 'Corrective',  priority: 'High',     status: 'Assigned',    asset_id: 3, request_id: 3, assigned_to: TECH_ID, created_by: SUP_ID,  scheduled_start: iso(1), scheduled_end: null,    actual_start: null,   actual_end: null,    estimated_hours: 3,   actual_hours: null, labor_cost: null, parts_cost: null, notes: null, completion_notes: null, created_at: iso(6), updated_at: iso(5), asset: { name: 'Generator 200KVA',      asset_code: 'AST-003' }, assignee: { full_name: 'Mike Technician' } },
    { id: 3, wo_number: 'WO-202412-0003', title: 'Forklift Hydraulic Seal Replacement',description: 'Replace hydraulic cylinder seal, test all functions',     type: 'Corrective',  priority: 'Medium',   status: 'Completed',   asset_id: 5, request_id: 4, assigned_to: TECH_ID, created_by: SUP_ID,  scheduled_start: iso(13),scheduled_end: iso(11),actual_start: iso(12),actual_end: iso(10), estimated_hours: 3,   actual_hours: 2.5,  labor_cost: 1200, parts_cost: 650,  notes: null, completion_notes: 'Replaced hydraulic cylinder seal. Tested all functions — OK.', created_at: iso(13), updated_at: iso(10), asset: { name: 'Forklift Toyota 2.5T', asset_code: 'AST-005' }, assignee: { full_name: 'Mike Technician' } },
    { id: 4, wo_number: 'WO-202412-0004', title: 'Water Pump Monthly PM',              description: 'Monthly inspection, lubrication, and seal check',         type: 'Preventive',  priority: 'Low',      status: 'Open',        asset_id: 1, request_id: null, assigned_to: null,  created_by: ADMIN_ID,scheduled_start: null,   scheduled_end: null,    actual_start: null,   actual_end: null,    estimated_hours: 1,   actual_hours: null, labor_cost: null, parts_cost: null, notes: null, completion_notes: null, created_at: iso(1), updated_at: iso(1), asset: { name: 'Water Pump #1',         asset_code: 'AST-001' }, assignee: null },
    { id: 5, wo_number: 'WO-202411-0005', title: 'Cooling Tower Annual Service',       description: 'Annual cleaning, fan inspection, fill media check',       type: 'Preventive',  priority: 'Medium',   status: 'Completed',   asset_id: 8, request_id: null, assigned_to: TECH_ID, created_by: ADMIN_ID,scheduled_start: iso(32),scheduled_end: iso(28),actual_start: iso(31),actual_end: iso(25), estimated_hours: 8,   actual_hours: 6,    labor_cost: 2400, parts_cost: 1200, notes: null, completion_notes: 'Full annual service completed. Fill media replaced.', created_at: iso(32), updated_at: iso(25), asset: { name: 'Cooling Tower', asset_code: 'AST-008' }, assignee: { full_name: 'Mike Technician' } },
  ],
  pm_plans: [
    { id: 1, plan_number: 'PM-202401-0001', title: 'Water Pump Monthly PM',  description: 'Monthly inspection and lubrication', asset_id: 1, frequency: 'Monthly',    estimated_duration: 60,  assigned_to: TECH_ID, last_performed_date: dateStr(-30), next_due_date: dateStr(7),   is_active: true, checklist: ['Check vibration level','Check mechanical seals','Lubricate bearings','Measure flow rate','Check discharge pressure'], created_at: iso(300), updated_at: iso(), asset: { name: 'Water Pump #1',         asset_code: 'AST-001' }, assignee: { full_name: 'Mike Technician' } },
    { id: 2, plan_number: 'PM-202401-0002', title: 'Generator Weekly Check',  description: 'Weekly run test and fluid inspection', asset_id: 3, frequency: 'Weekly',    estimated_duration: 30,  assigned_to: TECH_ID, last_performed_date: dateStr(-7),  next_due_date: dateStr(2),   is_active: true, checklist: ['Run test for 30 min','Check oil level','Check coolant level','Check battery voltage','Check fuel level'], created_at: iso(300), updated_at: iso(), asset: { name: 'Generator 200KVA',       asset_code: 'AST-003' }, assignee: { full_name: 'Mike Technician' } },
    { id: 3, plan_number: 'PM-202401-0003', title: 'HVAC Quarterly Service',  description: 'Quarterly filter and coil cleaning', asset_id: 4, frequency: 'Quarterly',  estimated_duration: 90,  assigned_to: null,    last_performed_date: dateStr(-95), next_due_date: dateStr(-5),  is_active: true, checklist: ['Replace air filters','Clean evaporator coils','Clean condenser coils','Check refrigerant pressure','Check drain pan'], created_at: iso(300), updated_at: iso(), asset: { name: 'HVAC Unit Roof A',       asset_code: 'AST-004' }, assignee: null },
    { id: 4, plan_number: 'PM-202401-0004', title: 'Forklift Monthly PM',     description: 'Monthly safety and mechanical check', asset_id: 5, frequency: 'Monthly',   estimated_duration: 45,  assigned_to: TECH_ID, last_performed_date: dateStr(-28), next_due_date: dateStr(14),  is_active: true, checklist: ['Check tyre pressure','Inspect forks for damage','Test hydraulic functions','Check horn and lights','Check seat belt'], created_at: iso(300), updated_at: iso(), asset: { name: 'Forklift Toyota 2.5T',   asset_code: 'AST-005' }, assignee: { full_name: 'Mike Technician' } },
    { id: 5, plan_number: 'PM-202401-0005', title: 'Fire Pump Annual Test',   description: 'Annual flow and performance test', asset_id: 6, frequency: 'Annual',      estimated_duration: 120, assigned_to: null,    last_performed_date: dateStr(-365),next_due_date: dateStr(45),  is_active: true, checklist: ['Perform flow test','Check discharge pressure','Inspect all couplings','Check packing gland','Test automatic start'], created_at: iso(300), updated_at: iso(), asset: { name: 'Fire Pump',              asset_code: 'AST-006' }, assignee: null },
    { id: 6, plan_number: 'PM-202401-0006', title: 'Electrical Panel Thermoscan', description: 'Semi-annual thermographic survey', asset_id: 7, frequency: 'Semi-Annual', estimated_duration: 60, assigned_to: TECH_ID, last_performed_date: dateStr(-180),next_due_date: dateStr(30), is_active: true, checklist: ['Thermal imaging scan','Check torque on busbars','Inspect breakers','Record temperature readings','Check cable insulation'], created_at: iso(300), updated_at: iso(), asset: { name: 'Main Electrical Panel',  asset_code: 'AST-007' }, assignee: { full_name: 'Mike Technician' } },
  ],
  spare_parts: [
    { id: 1, part_code: 'SP-001', name: 'Ball Bearing 6205',      category: 'Bearings',   unit: 'EA',  current_stock: 8,  minimum_stock: 3, maximum_stock: 20, unit_cost: 250,  location: 'Shelf A1',    supplier: 'Thai Bearing Co.',  photo_url: null, is_active: true, created_at: iso(200), updated_at: iso() },
    { id: 2, part_code: 'SP-002', name: 'Mechanical Seal 50mm',   category: 'Seals',      unit: 'EA',  current_stock: 5,  minimum_stock: 2, maximum_stock: 10, unit_cost: 1200, location: 'Shelf A2',    supplier: 'Pump Parts Ltd.',   photo_url: null, is_active: true, created_at: iso(200), updated_at: iso() },
    { id: 3, part_code: 'SP-003', name: 'V-Belt A-50',            category: 'Belts',      unit: 'EA',  current_stock: 12, minimum_stock: 4, maximum_stock: 24, unit_cost: 180,  location: 'Shelf B1',    supplier: 'Belt King Co.',     photo_url: null, is_active: true, created_at: iso(200), updated_at: iso() },
    { id: 4, part_code: 'SP-004', name: 'Air Filter Element',     category: 'Filters',    unit: 'EA',  current_stock: 0,  minimum_stock: 2, maximum_stock: 8,  unit_cost: 450,  location: 'Shelf B2',    supplier: 'Filter World',      photo_url: null, is_active: true, created_at: iso(200), updated_at: iso() },
    { id: 5, part_code: 'SP-005', name: 'Hydraulic Oil 46 (20L)', category: 'Lubricants', unit: 'EA',  current_stock: 4,  minimum_stock: 2, maximum_stock: 10, unit_cost: 1800, location: 'Tank Room',   supplier: 'Oil Depot',         photo_url: null, is_active: true, created_at: iso(200), updated_at: iso() },
    { id: 6, part_code: 'SP-006', name: 'Grease Cartridge SKF',   category: 'Lubricants', unit: 'EA',  current_stock: 20, minimum_stock: 5, maximum_stock: 30, unit_cost: 120,  location: 'Shelf A3',    supplier: 'SKF Thailand',      photo_url: null, is_active: true, created_at: iso(200), updated_at: iso() },
    { id: 7, part_code: 'SP-007', name: 'Relay 24VDC',            category: 'Electrical', unit: 'EA',  current_stock: 2,  minimum_stock: 2, maximum_stock: 10, unit_cost: 380,  location: 'Elec. Store', supplier: 'Electric Plus',     photo_url: null, is_active: true, created_at: iso(200), updated_at: iso() },
    { id: 8, part_code: 'SP-008', name: 'O-Ring Kit Assorted',    category: 'Seals',      unit: 'SET', current_stock: 3,  minimum_stock: 1, maximum_stock: 6,  unit_cost: 650,  location: 'Shelf A2',    supplier: 'Seal Masters',      photo_url: null, is_active: true, created_at: iso(200), updated_at: iso() },
  ],
  stock_transactions: [
    { id: 1, part_id: 1, transaction_type: 'Issue',      quantity: -2, balance_after: 8,  reference_number: 'WO-202412-0001', wo_id: 1, remark: 'Used for pump bearing replacement',  transaction_date: iso(3),  part: { name: 'Ball Bearing 6205',        part_code: 'SP-001' }, performed_by: TECH_ID },
    { id: 2, part_id: 2, transaction_type: 'Receive',    quantity:  5, balance_after: 5,  reference_number: 'PO-2024-0156',   wo_id: null, remark: 'Purchase order received',        transaction_date: iso(7),  part: { name: 'Mechanical Seal 50mm',     part_code: 'SP-002' }, performed_by: ADMIN_ID },
    { id: 3, part_id: 3, transaction_type: 'Issue',      quantity: -2, balance_after: 12, reference_number: 'WO-202411-0002', wo_id: 5, remark: 'V-belt replacement during service', transaction_date: iso(10), part: { name: 'V-Belt A-50',              part_code: 'SP-003' }, performed_by: TECH_ID },
    { id: 4, part_id: 4, transaction_type: 'Issue',      quantity: -1, balance_after: 0,  reference_number: 'WO-202411-0003', wo_id: 5, remark: 'Monthly PM task air filter change', transaction_date: iso(14), part: { name: 'Air Filter Element',       part_code: 'SP-004' }, performed_by: TECH_ID },
    { id: 5, part_id: 5, transaction_type: 'Adjustment', quantity: -1, balance_after: 4,  reference_number: 'ADJ-001',         wo_id: null, remark: 'Physical count adjustment',      transaction_date: iso(20), part: { name: 'Hydraulic Oil 46 (20L)',   part_code: 'SP-005' }, performed_by: ADMIN_ID },
    { id: 6, part_id: 6, transaction_type: 'Receive',    quantity: 10, balance_after: 20, reference_number: 'PO-2024-0148',   wo_id: null, remark: 'Replenishment stock',            transaction_date: iso(25), part: { name: 'Grease Cartridge SKF',     part_code: 'SP-006' }, performed_by: ADMIN_ID },
    { id: 7, part_id: 7, transaction_type: 'Issue',      quantity: -1, balance_after: 2,  reference_number: 'WO-202412-0001', wo_id: 1, remark: 'Relay replacement HVAC control',   transaction_date: iso(4),  part: { name: 'Relay 24VDC',              part_code: 'SP-007' }, performed_by: TECH_ID },
  ],
  pm_records: [],
  work_order_parts: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock Auth
// ─────────────────────────────────────────────────────────────────────────────

const USERS: Record<string, { id: string; password: string }> = {
  'admin@cmms.local':      { id: ADMIN_ID, password: 'Admin@1234' },
  'supervisor@cmms.local': { id: SUP_ID,   password: 'Admin@1234' },
  'tech@cmms.local':       { id: TECH_ID,  password: 'Admin@1234' },
  'requester@cmms.local':  { id: REQ_ID,   password: 'Admin@1234' },
};

const SESSION_KEY = 'cmms_mock_session';

type AuthChangeCallback = (event: string, session: any) => void;
const authListeners: AuthChangeCallback[] = [];

const mockAuth = {
  getSession: async () => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { data: { session: null }, error: null };
    try { return { data: { session: JSON.parse(raw) }, error: null }; }
    catch { return { data: { session: null }, error: null }; }
  },
  onAuthStateChange: (cb: AuthChangeCallback) => {
    authListeners.push(cb);
    // Fire with current session immediately
    const raw = localStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    setTimeout(() => cb('INITIAL_SESSION', session), 0);
    return { data: { subscription: { unsubscribe: () => { const idx = authListeners.indexOf(cb); if (idx > -1) authListeners.splice(idx, 1); } } } };
  },
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const match = USERS[email.toLowerCase()];
    if (!match || match.password !== password) {
      return { data: null, error: { message: 'Invalid email or password' } };
    }
    const session = {
      access_token: 'mock-token-' + Date.now(),
      user: { id: match.id, email },
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    authListeners.forEach(cb => cb('SIGNED_IN', session));
    return { data: { session }, error: null };
  },
  signUp: async ({ email, password, options }: any) => {
    if (USERS[email.toLowerCase()]) return { data: null, error: { message: 'Email already registered' } };
    const newId = 'u-' + Date.now();
    USERS[email.toLowerCase()] = { id: newId, password };
    const meta = options?.data || {};
    db.profiles.push({
      id: newId, full_name: meta.full_name || email.split('@')[0],
      username: meta.username || email.split('@')[0],
      role: meta.role || 'requester', department: null, phone: null,
      avatar_url: null, is_active: true,
      created_at: iso(), updated_at: iso(),
    });
    return { data: { user: { id: newId, email } }, error: null };
  },
  signOut: async () => {
    localStorage.removeItem(SESSION_KEY);
    authListeners.forEach(cb => cb('SIGNED_OUT', null));
    return { error: null };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock Query Builder
// ─────────────────────────────────────────────────────────────────────────────

type Filter = (row: AnyRow) => boolean;

class MockQueryBuilder {
  private table: string;
  private _cols = '';
  private _filters: Filter[] = [];
  private _orderCol: string | null = null;
  private _orderAsc = false;
  private _limitN: number | null = null;
  private _single = false;
  private _op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private _payload: any = null;

  constructor(table: string) { this.table = table; }

  select(cols = '*') { this._cols = cols; return this; }
  eq(col: string, val: any) { this._filters.push(r => String(r[col]) === String(val)); return this; }
  neq(col: string, val: any) { this._filters.push(r => String(r[col]) !== String(val)); return this; }
  gte(col: string, val: any) { this._filters.push(r => r[col] >= val); return this; }
  lte(col: string, val: any) { this._filters.push(r => r[col] <= val); return this; }
  not(_c: string, _o: string, _v: any) { return this; }
  is(_c: string, _v: any) { return this; }
  in(col: string, vals: any[]) { this._filters.push(r => vals.includes(r[col])); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this._orderCol = col; this._orderAsc = opts?.ascending !== false; return this; }
  limit(n: number) { this._limitN = n; return this; }
  single() { this._single = true; return this; }
  insert(payload: any) { this._op = 'insert'; this._payload = payload; return this; }
  update(payload: any) { this._op = 'update'; this._payload = payload; return this; }
  delete() { this._op = 'delete'; return this; }
  upsert(payload: any, _opts?: any) { this._op = 'insert'; this._payload = payload; return this; }

  // Make the builder awaitable (thenable)
  then(resolve: (v: any) => any, reject?: (e: any) => any) {
    return Promise.resolve(this._run()).then(resolve, reject);
  }

  private _run() {
    const rows = db[this.table] ?? [];

    if (this._op === 'insert') {
      const arr = Array.isArray(this._payload) ? this._payload : [this._payload];
      const inserted = arr.map((p: any) => ({
        id: (db[this.table]?.length ?? 0) + 1 + Math.floor(Math.random() * 1000),
        created_at: iso(), updated_at: iso(), ...p,
      }));
      if (!db[this.table]) db[this.table] = [];
      db[this.table].push(...inserted);
      return { data: inserted.length === 1 ? inserted[0] : inserted, error: null };
    }

    let filtered = rows.filter(r => this._filters.every(f => f(r)));

    if (this._op === 'update') {
      filtered.forEach(r => { Object.assign(r, this._payload, { updated_at: iso() }); });
      return { data: filtered, error: null };
    }

    if (this._op === 'delete') {
      const ids = new Set(filtered.map(r => r.id));
      db[this.table] = rows.filter(r => !ids.has(r.id));
      return { data: null, error: null };
    }

    // select
    if (this._orderCol) {
      const col = this._orderCol, asc = this._orderAsc;
      filtered = [...filtered].sort((a, b) => {
        if (a[col] < b[col]) return asc ? -1 : 1;
        if (a[col] > b[col]) return asc ? 1 : -1;
        return 0;
      });
    }

    if (this._limitN !== null) filtered = filtered.slice(0, this._limitN);

    if (this._single) {
      return filtered.length ? { data: filtered[0], error: null } : { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
    }

    return { data: filtered, error: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Storage
// ─────────────────────────────────────────────────────────────────────────────

const mockStorage = {
  from: (bucket: string) => ({
    upload: async (path: string, _file: any) => ({ data: { path }, error: null }),
    getPublicUrl: (path: string) => ({
      data: { publicUrl: `https://placehold.co/400x300/3b82f6/ffffff?text=Photo` },
    }),
    list: async () => ({ data: [], error: null }),
    remove: async (_paths: string[]) => ({ data: null, error: null }),
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Export mock client with same interface as real Supabase
// ─────────────────────────────────────────────────────────────────────────────

export const supabase = {
  auth: mockAuth,
  from: (table: string) => new MockQueryBuilder(table),
  storage: mockStorage,
} as any;

export default supabase;
