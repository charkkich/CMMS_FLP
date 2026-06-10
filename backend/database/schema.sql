-- ============================================================
-- CMMS Database Schema
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'supervisor', 'technician', 'requester')),
  department VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE NOT NULL,
  asset_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Building','Generator','Pump','Irrigation System','Air Compressor','Electrical Panel','Other Equipment')),
  location VARCHAR(200),
  serial_number VARCHAR(100),
  manufacturer VARCHAR(100),
  model VARCHAR(100),
  purchase_date DATE,
  warranty_expiry DATE,
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Under Maintenance','Decommissioned')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id SERIAL PRIMARY KEY,
  request_number VARCHAR(50) UNIQUE NOT NULL,
  request_date TIMESTAMP DEFAULT NOW(),
  requester_id INT REFERENCES users(id),
  department VARCHAR(100),
  location VARCHAR(200),
  asset_id INT REFERENCES assets(id),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low','Medium','High','Critical')),
  problem_description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'Submitted' CHECK (status IN ('Submitted','Approved','Rejected','Converted to Work Order')),
  photos JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  rejection_reason TEXT,
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
  id SERIAL PRIMARY KEY,
  wo_number VARCHAR(50) UNIQUE NOT NULL,
  request_id INT REFERENCES maintenance_requests(id),
  asset_id INT REFERENCES assets(id),
  assigned_technician INT REFERENCES users(id),
  supervisor_id INT REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  work_description TEXT,
  start_date TIMESTAMP,
  due_date TIMESTAMP,
  completion_date TIMESTAMP,
  root_cause TEXT,
  corrective_action TEXT,
  labor_hours DECIMAL(10,2),
  status VARCHAR(30) DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Waiting Spare Part','Completed','Closed')),
  before_photos JSONB DEFAULT '[]',
  after_photos JSONB DEFAULT '[]',
  priority VARCHAR(20) DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High','Critical')),
  type VARCHAR(20) DEFAULT 'Corrective' CHECK (type IN ('Corrective','Preventive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PM Plans
CREATE TABLE IF NOT EXISTS pm_plans (
  id SERIAL PRIMARY KEY,
  pm_code VARCHAR(50) UNIQUE NOT NULL,
  asset_id INT REFERENCES assets(id),
  title VARCHAR(200) NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('Weekly','Monthly','Quarterly','Semi-Annual','Annual')),
  responsible_person INT REFERENCES users(id),
  checklist JSONB DEFAULT '[]',
  next_due_date DATE,
  last_completed_date DATE,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PM Records
CREATE TABLE IF NOT EXISTS pm_records (
  id SERIAL PRIMARY KEY,
  pm_plan_id INT REFERENCES pm_plans(id),
  work_order_id INT REFERENCES work_orders(id),
  technician_id INT REFERENCES users(id),
  completion_date TIMESTAMP,
  checklist_results JSONB DEFAULT '[]',
  remarks TEXT,
  photos JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending','Completed','Overdue')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spare Parts
CREATE TABLE IF NOT EXISTS spare_parts (
  id SERIAL PRIMARY KEY,
  part_number VARCHAR(100) UNIQUE NOT NULL,
  part_name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(50),
  current_stock INT DEFAULT 0,
  minimum_stock INT DEFAULT 0,
  storage_location VARCHAR(200),
  unit_cost DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stock Transactions
CREATE TABLE IF NOT EXISTS stock_transactions (
  id SERIAL PRIMARY KEY,
  part_id INT REFERENCES spare_parts(id),
  transaction_date TIMESTAMP DEFAULT NOW(),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('Receive','Issue','Adjustment')),
  quantity INT NOT NULL,
  reference_number VARCHAR(100),
  work_order_id INT REFERENCES work_orders(id),
  performed_by INT REFERENCES users(id),
  remark TEXT,
  balance_after INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Work Order Parts (spare parts used in work orders)
CREATE TABLE IF NOT EXISTS work_order_parts (
  id SERIAL PRIMARY KEY,
  work_order_id INT REFERENCES work_orders(id),
  part_id INT REFERENCES spare_parts(id),
  quantity INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON maintenance_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_workorders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_workorders_technician ON work_orders(assigned_technician);
CREATE INDEX IF NOT EXISTS idx_workorders_asset ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_pm_plans_asset ON pm_plans(asset_id);
CREATE INDEX IF NOT EXISTS idx_stock_part ON stock_transactions(part_id);

-- Default admin user (password: Admin@1234)
-- Hash generated with bcrypt rounds=10
INSERT INTO users (username, email, password_hash, full_name, role, department, is_active)
VALUES (
  'admin',
  'admin@cmms.local',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'System Administrator',
  'admin',
  'IT',
  true
) ON CONFLICT (username) DO NOTHING;
