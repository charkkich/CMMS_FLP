import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/kpis
router.get('/kpis', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [requests, workorders, pmDue, lowStock, assets] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'Submitted') AS submitted,
          COUNT(*) FILTER (WHERE status = 'Approved') AS approved,
          COUNT(*) FILTER (WHERE status = 'Rejected') AS rejected,
          COUNT(*) FILTER (WHERE status = 'Converted to Work Order') AS converted
        FROM maintenance_requests
      `),
      query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'Open') AS open,
          COUNT(*) FILTER (WHERE status = 'In Progress') AS in_progress,
          COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'Closed') AS closed,
          COUNT(*) FILTER (WHERE status = 'Waiting Spare Part') AS waiting_spare_part,
          COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('Completed','Closed')) AS overdue
        FROM work_orders
      `),
      query(`
        SELECT COUNT(*) AS pm_due
        FROM pm_plans
        WHERE next_due_date <= CURRENT_DATE + INTERVAL '30 days'
          AND next_due_date >= CURRENT_DATE
          AND is_active = true
      `),
      query(`
        SELECT COUNT(*) AS low_stock
        FROM spare_parts
        WHERE current_stock <= minimum_stock AND minimum_stock > 0
      `),
      query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'Active') AS active,
          COUNT(*) FILTER (WHERE status = 'Under Maintenance') AS under_maintenance
        FROM assets
      `),
    ]);

    // MTTR calculation (avg hours to complete corrective work orders this month)
    const mttr = await query(`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completion_date - start_date)) / 3600)::numeric, 2) AS mttr_hours
      FROM work_orders
      WHERE type = 'Corrective'
        AND status IN ('Completed', 'Closed')
        AND completion_date >= DATE_TRUNC('month', NOW())
        AND start_date IS NOT NULL
        AND completion_date IS NOT NULL
    `);

    res.json({
      requests: requests.rows[0],
      workorders: workorders.rows[0],
      assets: assets.rows[0],
      pm_due: parseInt(pmDue.rows[0].pm_due),
      low_stock: parseInt(lowStock.rows[0].low_stock),
      mttr_hours: mttr.rows[0].mttr_hours || 0,
    });
  } catch (err) {
    console.error('KPI error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/charts/monthly-requests
router.get('/charts/monthly-requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', request_date), 'Mon YYYY') AS month,
        DATE_TRUNC('month', request_date) AS month_date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE priority = 'Critical') AS critical,
        COUNT(*) FILTER (WHERE priority = 'High') AS high,
        COUNT(*) FILTER (WHERE priority = 'Medium') AS medium,
        COUNT(*) FILTER (WHERE priority = 'Low') AS low
      FROM maintenance_requests
      WHERE request_date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', request_date)
      ORDER BY month_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Monthly requests chart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/charts/wo-status
router.get('/charts/wo-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT status, COUNT(*) AS count
      FROM work_orders
      GROUP BY status
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('WO status chart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/charts/top-breakdown-assets
router.get('/charts/top-breakdown-assets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT a.asset_name, a.asset_id, COUNT(wo.id) AS count
      FROM work_orders wo
      JOIN assets a ON wo.asset_id = a.id
      WHERE wo.type = 'Corrective'
      GROUP BY a.id, a.asset_name, a.asset_id
      ORDER BY count DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Top breakdown assets chart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/charts/monthly-wo
router.get('/charts/monthly-wo', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
        DATE_TRUNC('month', created_at) AS month_date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE type = 'Corrective') AS corrective,
        COUNT(*) FILTER (WHERE type = 'Preventive') AS preventive,
        COUNT(*) FILTER (WHERE status IN ('Completed','Closed')) AS completed
      FROM work_orders
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month_date ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Monthly WO chart error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [requests, workorders, completedWOs] = await Promise.all([
      query(`
        SELECT mr.id, mr.request_number, mr.priority, mr.status, mr.request_date,
               mr.problem_description, u.full_name AS requester_name, a.asset_name
        FROM maintenance_requests mr
        LEFT JOIN users u ON mr.requester_id = u.id
        LEFT JOIN assets a ON mr.asset_id = a.id
        ORDER BY mr.created_at DESC
        LIMIT 5
      `),
      query(`
        SELECT wo.id, wo.wo_number, wo.title, wo.status, wo.priority, wo.due_date, wo.created_at,
               u.full_name AS technician_name, a.asset_name
        FROM work_orders wo
        LEFT JOIN users u ON wo.assigned_technician = u.id
        LEFT JOIN assets a ON wo.asset_id = a.id
        WHERE wo.status NOT IN ('Completed','Closed')
        ORDER BY
          CASE wo.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
          wo.due_date ASC NULLS LAST
        LIMIT 5
      `),
      query(`
        SELECT wo.id, wo.wo_number, wo.title, wo.completion_date, wo.labor_hours,
               u.full_name AS technician_name, a.asset_name
        FROM work_orders wo
        LEFT JOIN users u ON wo.assigned_technician = u.id
        LEFT JOIN assets a ON wo.asset_id = a.id
        WHERE wo.status IN ('Completed','Closed')
        ORDER BY wo.completion_date DESC NULLS LAST
        LIMIT 5
      `),
    ]);

    res.json({
      recent_requests: requests.rows,
      urgent_work_orders: workorders.rows,
      recently_completed: completedWOs.rows,
    });
  } catch (err) {
    console.error('Recent activity error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
