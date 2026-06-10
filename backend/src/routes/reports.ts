import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to build date range filter
function buildDateFilter(
  field: string,
  date_from?: string,
  date_to?: string,
  params: any[] = [],
  startIdx: number = 1
): { clause: string; params: any[]; nextIdx: number } {
  const clauses: string[] = [];
  let idx = startIdx;

  if (date_from) {
    clauses.push(`${field} >= $${idx++}`);
    params.push(date_from);
  }
  if (date_to) {
    clauses.push(`${field} <= $${idx++}`);
    params.push(date_to);
  }

  return {
    clause: clauses.join(' AND '),
    params,
    nextIdx: idx,
  };
}

// GET /api/reports/maintenance-requests
router.get('/maintenance-requests', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      status, priority, department, requester_id,
      date_from, date_to,
    } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) { conditions.push(`mr.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`mr.priority = $${idx++}`); params.push(priority); }
    if (department) { conditions.push(`mr.department ILIKE $${idx++}`); params.push(`%${department}%`); }
    if (requester_id) { conditions.push(`mr.requester_id = $${idx++}`); params.push(requester_id); }
    if (date_from) { conditions.push(`mr.request_date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`mr.request_date <= $${idx++}`); params.push(date_to); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, summaryRes] = await Promise.all([
      query(
        `SELECT mr.*,
                u.full_name AS requester_name,
                a.asset_name, a.asset_id AS asset_code,
                ab.full_name AS approver_name
         FROM maintenance_requests mr
         LEFT JOIN users u ON mr.requester_id = u.id
         LEFT JOIN assets a ON mr.asset_id = a.id
         LEFT JOIN users ab ON mr.approved_by = ab.id
         ${whereClause}
         ORDER BY mr.request_date DESC`,
        params
      ),
      query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE mr.status = 'Submitted') AS submitted,
           COUNT(*) FILTER (WHERE mr.status = 'Approved') AS approved,
           COUNT(*) FILTER (WHERE mr.status = 'Rejected') AS rejected,
           COUNT(*) FILTER (WHERE mr.status = 'Converted to Work Order') AS converted,
           COUNT(*) FILTER (WHERE mr.priority = 'Critical') AS critical,
           COUNT(*) FILTER (WHERE mr.priority = 'High') AS high,
           COUNT(*) FILTER (WHERE mr.priority = 'Medium') AS medium,
           COUNT(*) FILTER (WHERE mr.priority = 'Low') AS low
         FROM maintenance_requests mr
         ${whereClause}`,
        params
      ),
    ]);

    res.json({
      summary: summaryRes.rows[0],
      data: dataRes.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('MR report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/work-orders
router.get('/work-orders', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      status, priority, type, technician_id, asset_id,
      date_from, date_to,
    } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) { conditions.push(`wo.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`wo.priority = $${idx++}`); params.push(priority); }
    if (type) { conditions.push(`wo.type = $${idx++}`); params.push(type); }
    if (technician_id) { conditions.push(`wo.assigned_technician = $${idx++}`); params.push(technician_id); }
    if (asset_id) { conditions.push(`wo.asset_id = $${idx++}`); params.push(asset_id); }
    if (date_from) { conditions.push(`wo.created_at >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`wo.created_at <= $${idx++}`); params.push(date_to); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, summaryRes, mttrRes] = await Promise.all([
      query(
        `SELECT wo.*,
                t.full_name AS technician_name,
                s.full_name AS supervisor_name,
                a.asset_name, a.asset_id AS asset_code,
                mr.request_number
         FROM work_orders wo
         LEFT JOIN users t ON wo.assigned_technician = t.id
         LEFT JOIN users s ON wo.supervisor_id = s.id
         LEFT JOIN assets a ON wo.asset_id = a.id
         LEFT JOIN maintenance_requests mr ON wo.request_id = mr.id
         ${whereClause}
         ORDER BY wo.created_at DESC`,
        params
      ),
      query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE wo.status = 'Open') AS open,
           COUNT(*) FILTER (WHERE wo.status = 'In Progress') AS in_progress,
           COUNT(*) FILTER (WHERE wo.status = 'Completed') AS completed,
           COUNT(*) FILTER (WHERE wo.status = 'Closed') AS closed,
           COUNT(*) FILTER (WHERE wo.status = 'Waiting Spare Part') AS waiting_spare_part,
           COUNT(*) FILTER (WHERE wo.type = 'Corrective') AS corrective,
           COUNT(*) FILTER (WHERE wo.type = 'Preventive') AS preventive,
           ROUND(AVG(wo.labor_hours) FILTER (WHERE wo.status IN ('Completed','Closed'))::numeric, 2) AS avg_labor_hours,
           SUM(wo.labor_hours) FILTER (WHERE wo.status IN ('Completed','Closed')) AS total_labor_hours,
           COUNT(*) FILTER (WHERE wo.due_date < NOW() AND wo.status NOT IN ('Completed','Closed')) AS overdue
         FROM work_orders wo
         ${whereClause}`,
        params
      ),
      query(
        `SELECT
           ROUND(AVG(EXTRACT(EPOCH FROM (wo.completion_date - wo.start_date)) / 3600)::numeric, 2) AS mttr_hours
         FROM work_orders wo
         ${whereClause.replace('WHERE', 'WHERE')}
         ${whereClause ? 'AND' : 'WHERE'} wo.type = 'Corrective'
           AND wo.status IN ('Completed','Closed')
           AND wo.start_date IS NOT NULL
           AND wo.completion_date IS NOT NULL`,
        params
      ),
    ]);

    res.json({
      summary: { ...summaryRes.rows[0], mttr_hours: mttrRes.rows[0].mttr_hours || 0 },
      data: dataRes.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('WO report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/pm-report
router.get('/pm-report', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const { asset_id, frequency, status, date_from, date_to } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (asset_id) { conditions.push(`pp.asset_id = $${idx++}`); params.push(asset_id); }
    if (frequency) { conditions.push(`pp.frequency = $${idx++}`); params.push(frequency); }

    const planWhere = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // PM Plans summary
    const plansRes = await query(
      `SELECT pp.*,
              a.asset_name, a.asset_id AS asset_code,
              u.full_name AS responsible_person_name,
              (SELECT COUNT(*) FROM pm_records WHERE pm_plan_id = pp.id) AS total_records,
              (SELECT COUNT(*) FROM pm_records WHERE pm_plan_id = pp.id AND status = 'Completed') AS completed_records
       FROM pm_plans pp
       LEFT JOIN assets a ON pp.asset_id = a.id
       LEFT JOIN users u ON pp.responsible_person = u.id
       ${planWhere}
       ORDER BY pp.next_due_date ASC`,
      params
    );

    // PM Records
    const recConditions: string[] = [];
    const recParams: any[] = [];
    let recIdx = 1;

    if (status) { recConditions.push(`pr.status = $${recIdx++}`); recParams.push(status); }
    if (date_from) { recConditions.push(`pr.created_at >= $${recIdx++}`); recParams.push(date_from); }
    if (date_to) { recConditions.push(`pr.created_at <= $${recIdx++}`); recParams.push(date_to); }

    const recWhere = recConditions.length > 0 ? `WHERE ${recConditions.join(' AND ')}` : '';

    const recordsRes = await query(
      `SELECT pr.*,
              pp.title AS plan_title, pp.frequency, pp.pm_code,
              a.asset_name,
              t.full_name AS technician_name
       FROM pm_records pr
       JOIN pm_plans pp ON pr.pm_plan_id = pp.id
       LEFT JOIN assets a ON pp.asset_id = a.id
       LEFT JOIN users t ON pr.technician_id = t.id
       ${recWhere}
       ORDER BY pr.created_at DESC`,
      recParams
    );

    // Summary stats
    const statsRes = await query(
      `SELECT
         COUNT(*) AS total_plans,
         COUNT(*) FILTER (WHERE is_active = true) AS active_plans,
         COUNT(*) FILTER (WHERE next_due_date < CURRENT_DATE AND is_active = true) AS overdue_plans,
         COUNT(*) FILTER (WHERE next_due_date <= CURRENT_DATE + INTERVAL '30 days' AND next_due_date >= CURRENT_DATE AND is_active = true) AS due_soon
       FROM pm_plans`
    );

    res.json({
      summary: statsRes.rows[0],
      plans: plansRes.rows,
      records: recordsRes.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('PM report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/spare-parts
router.get('/spare-parts', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const { category, stock_status, date_from, date_to } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (category) { conditions.push(`sp.category = $${idx++}`); params.push(category); }
    if (stock_status === 'low') { conditions.push(`sp.current_stock <= sp.minimum_stock AND sp.minimum_stock > 0`); }
    else if (stock_status === 'out') { conditions.push(`sp.current_stock = 0`); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Parts inventory
    const partsRes = await query(
      `SELECT sp.*,
              (sp.current_stock * sp.unit_cost) AS total_value,
              CASE
                WHEN sp.current_stock = 0 THEN 'out_of_stock'
                WHEN sp.current_stock <= sp.minimum_stock AND sp.minimum_stock > 0 THEN 'low_stock'
                ELSE 'in_stock'
              END AS stock_status
       FROM spare_parts sp
       ${whereClause}
       ORDER BY sp.part_name ASC`,
      params
    );

    // Transaction summary
    const txConditions: string[] = [];
    const txParams: any[] = [];
    let txIdx = 1;
    if (date_from) { txConditions.push(`transaction_date >= $${txIdx++}`); txParams.push(date_from); }
    if (date_to) { txConditions.push(`transaction_date <= $${txIdx++}`); txParams.push(date_to); }
    const txWhere = txConditions.length > 0 ? `WHERE ${txConditions.join(' AND ')}` : '';

    const txRes = await query(
      `SELECT
         COUNT(*) AS total_transactions,
         COUNT(*) FILTER (WHERE transaction_type = 'Receive') AS total_receives,
         COUNT(*) FILTER (WHERE transaction_type = 'Issue') AS total_issues,
         COUNT(*) FILTER (WHERE transaction_type = 'Adjustment') AS total_adjustments,
         SUM(quantity) FILTER (WHERE transaction_type = 'Receive') AS total_received_qty,
         SUM(quantity) FILTER (WHERE transaction_type = 'Issue') AS total_issued_qty
       FROM stock_transactions
       ${txWhere}`,
      txParams
    );

    // Inventory summary
    const inventorySummaryRes = await query(
      `SELECT
         COUNT(*) AS total_parts,
         COUNT(*) FILTER (WHERE current_stock = 0) AS out_of_stock,
         COUNT(*) FILTER (WHERE current_stock <= minimum_stock AND minimum_stock > 0) AS low_stock,
         SUM(current_stock * unit_cost) AS total_inventory_value
       FROM spare_parts`
    );

    res.json({
      summary: {
        inventory: inventorySummaryRes.rows[0],
        transactions: txRes.rows[0],
      },
      parts: partsRes.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Spare parts report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reports/asset-performance
router.get('/asset-performance', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const { date_from, date_to } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (date_from) { conditions.push(`wo.created_at >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`wo.created_at <= $${idx++}`); params.push(date_to); }

    const joinWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
         a.id, a.asset_id AS asset_code, a.asset_name, a.category, a.location, a.status,
         COUNT(wo.id) AS total_work_orders,
         COUNT(wo.id) FILTER (WHERE wo.type = 'Corrective') AS corrective_count,
         COUNT(wo.id) FILTER (WHERE wo.type = 'Preventive') AS preventive_count,
         SUM(wo.labor_hours) FILTER (WHERE wo.status IN ('Completed','Closed')) AS total_labor_hours,
         ROUND(AVG(EXTRACT(EPOCH FROM (wo.completion_date - wo.start_date)) / 3600) FILTER (
           WHERE wo.type = 'Corrective' AND wo.status IN ('Completed','Closed')
                 AND wo.start_date IS NOT NULL AND wo.completion_date IS NOT NULL
         )::numeric, 2) AS avg_repair_time_hours,
         COUNT(pm.id) AS pm_plans_count
       FROM assets a
       LEFT JOIN work_orders wo ON a.id = wo.asset_id ${joinWhere}
       LEFT JOIN pm_plans pm ON a.id = pm.asset_id AND pm.is_active = true
       GROUP BY a.id, a.asset_id, a.asset_name, a.category, a.location, a.status
       ORDER BY corrective_count DESC, a.asset_name ASC`,
      params
    );

    res.json({
      data: result.rows,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Asset performance report error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
