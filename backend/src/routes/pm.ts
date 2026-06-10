import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── PM Plans ────────────────────────────────────────────────────────────────

// GET /api/pm/plans
router.get('/plans', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { asset_id, frequency, is_active, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (asset_id) { conditions.push(`pp.asset_id = $${idx++}`); params.push(asset_id); }
    if (frequency) { conditions.push(`pp.frequency = $${idx++}`); params.push(frequency); }
    if (is_active !== undefined) { conditions.push(`pp.is_active = $${idx++}`); params.push(is_active === 'true'); }
    if (search) {
      conditions.push(`(pp.pm_code ILIKE $${idx} OR pp.title ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT pp.*,
                a.asset_name, a.asset_id AS asset_code,
                u.full_name AS responsible_person_name,
                CASE WHEN pp.next_due_date < CURRENT_DATE THEN true ELSE false END AS is_overdue,
                CASE WHEN pp.next_due_date <= CURRENT_DATE + INTERVAL '7 days' AND pp.next_due_date >= CURRENT_DATE THEN true ELSE false END AS due_soon
         FROM pm_plans pp
         LEFT JOIN assets a ON pp.asset_id = a.id
         LEFT JOIN users u ON pp.responsible_person = u.id
         ${whereClause}
         ORDER BY pp.next_due_date ASC NULLS LAST
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(`SELECT COUNT(*) FROM pm_plans pp ${whereClause}`, params),
    ]);

    res.json({
      data: dataRes.rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(parseInt(countRes.rows[0].count) / limitNum),
      },
    });
  } catch (err) {
    console.error('List PM plans error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/pm/plans
router.post('/plans', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      asset_id, title, frequency, responsible_person,
      checklist = [], next_due_date, description, is_active = true,
    } = req.body;

    if (!title || !frequency) {
      return res.status(400).json({ message: 'Title and frequency are required' });
    }

    // Auto-generate PM code
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cntRes = await query(
      `SELECT COUNT(*) FROM pm_plans WHERE TO_CHAR(created_at, 'YYYYMM') = $1`, [ym]
    );
    const seq = parseInt(cntRes.rows[0].count) + 1;
    const pm_code = `PM-${ym}-${String(seq).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO pm_plans
         (pm_code, asset_id, title, frequency, responsible_person,
          checklist, next_due_date, description, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        pm_code, asset_id || null, title, frequency,
        responsible_person || null, JSON.stringify(checklist),
        next_due_date || null, description, is_active,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create PM plan error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pm/plans/:id
router.get('/plans/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [planRes, recordsRes] = await Promise.all([
      query(
        `SELECT pp.*,
                a.asset_name, a.asset_id AS asset_code,
                u.full_name AS responsible_person_name
         FROM pm_plans pp
         LEFT JOIN assets a ON pp.asset_id = a.id
         LEFT JOIN users u ON pp.responsible_person = u.id
         WHERE pp.id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT pr.*,
                t.full_name AS technician_name,
                wo.wo_number
         FROM pm_records pr
         LEFT JOIN users t ON pr.technician_id = t.id
         LEFT JOIN work_orders wo ON pr.work_order_id = wo.id
         WHERE pr.pm_plan_id = $1
         ORDER BY pr.created_at DESC
         LIMIT 10`,
        [req.params.id]
      ),
    ]);

    if (planRes.rows.length === 0) return res.status(404).json({ message: 'PM plan not found' });
    res.json({ ...planRes.rows[0], recent_records: recordsRes.rows });
  } catch (err) {
    console.error('Get PM plan error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/pm/plans/:id
router.put('/plans/:id', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      asset_id, title, frequency, responsible_person,
      checklist, next_due_date, description, is_active,
    } = req.body;

    const result = await query(
      `UPDATE pm_plans SET
         asset_id = COALESCE($1, asset_id),
         title = COALESCE($2, title),
         frequency = COALESCE($3, frequency),
         responsible_person = COALESCE($4, responsible_person),
         checklist = COALESCE($5::jsonb, checklist),
         next_due_date = COALESCE($6, next_due_date),
         description = COALESCE($7, description),
         is_active = COALESCE($8, is_active),
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        asset_id, title, frequency, responsible_person,
        checklist ? JSON.stringify(checklist) : null,
        next_due_date || null, description, is_active,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'PM plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update PM plan error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/pm/plans/:id  -- admin only
router.delete('/plans/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM pm_plans WHERE id = $1 RETURNING id, pm_code, title',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'PM plan not found' });
    res.json({ message: 'PM plan deleted', ...result.rows[0] });
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Cannot delete: PM plan has associated records' });
    }
    console.error('Delete PM plan error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PM Records ───────────────────────────────────────────────────────────────

// GET /api/pm/records
router.get('/records', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { pm_plan_id, status, technician_id, date_from, date_to, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (pm_plan_id) { conditions.push(`pr.pm_plan_id = $${idx++}`); params.push(pm_plan_id); }
    if (status) { conditions.push(`pr.status = $${idx++}`); params.push(status); }
    if (technician_id) { conditions.push(`pr.technician_id = $${idx++}`); params.push(technician_id); }
    if (date_from) { conditions.push(`pr.created_at >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`pr.created_at <= $${idx++}`); params.push(date_to); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT pr.*,
                pp.title AS plan_title, pp.frequency, pp.pm_code,
                a.asset_name,
                t.full_name AS technician_name,
                wo.wo_number
         FROM pm_records pr
         JOIN pm_plans pp ON pr.pm_plan_id = pp.id
         LEFT JOIN assets a ON pp.asset_id = a.id
         LEFT JOIN users t ON pr.technician_id = t.id
         LEFT JOIN work_orders wo ON pr.work_order_id = wo.id
         ${whereClause}
         ORDER BY pr.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(`SELECT COUNT(*) FROM pm_records pr ${whereClause}`, params),
    ]);

    res.json({
      data: dataRes.rows,
      pagination: {
        total: parseInt(countRes.rows[0].count),
        page: pageNum,
        limit: limitNum,
        total_pages: Math.ceil(parseInt(countRes.rows[0].count) / limitNum),
      },
    });
  } catch (err) {
    console.error('List PM records error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/pm/records
router.post('/records', authenticate, authorize('admin', 'supervisor', 'technician'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      pm_plan_id, work_order_id, technician_id, completion_date,
      checklist_results = [], remarks, photos = [], status = 'Completed',
    } = req.body;

    if (!pm_plan_id) return res.status(400).json({ message: 'PM plan ID is required' });

    // Verify PM plan exists
    const planRes = await query('SELECT * FROM pm_plans WHERE id = $1', [pm_plan_id]);
    if (planRes.rows.length === 0) return res.status(404).json({ message: 'PM plan not found' });

    const result = await query(
      `INSERT INTO pm_records
         (pm_plan_id, work_order_id, technician_id, completion_date,
          checklist_results, remarks, photos, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        pm_plan_id, work_order_id || null,
        technician_id || req.user!.id,
        completion_date || new Date(),
        JSON.stringify(checklist_results), remarks,
        JSON.stringify(photos), status,
      ]
    );

    // Update PM plan's last_completed_date and calculate next_due_date
    if (status === 'Completed') {
      const plan = planRes.rows[0];
      const completedDate = completion_date ? new Date(completion_date) : new Date();
      const nextDue = calculateNextDueDate(completedDate, plan.frequency);

      await query(
        `UPDATE pm_plans SET
           last_completed_date = $1,
           next_due_date = $2,
           updated_at = NOW()
         WHERE id = $3`,
        [completedDate, nextDue, pm_plan_id]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create PM record error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

function calculateNextDueDate(from: Date, frequency: string): Date {
  const d = new Date(from);
  switch (frequency) {
    case 'Weekly':     d.setDate(d.getDate() + 7); break;
    case 'Monthly':    d.setMonth(d.getMonth() + 1); break;
    case 'Quarterly':  d.setMonth(d.getMonth() + 3); break;
    case 'Semi-Annual':d.setMonth(d.getMonth() + 6); break;
    case 'Annual':     d.setFullYear(d.getFullYear() + 1); break;
    default:           d.setMonth(d.getMonth() + 1);
  }
  return d;
}

// ─── Calendar & Special Queries ───────────────────────────────────────────────

// GET /api/pm/calendar  -- PM schedule for next 3 months
router.get('/calendar', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT pp.id, pp.pm_code, pp.title, pp.frequency, pp.next_due_date,
              a.asset_name, a.asset_id AS asset_code,
              u.full_name AS responsible_person_name,
              pp.is_active,
              CASE
                WHEN pp.next_due_date < CURRENT_DATE THEN 'overdue'
                WHEN pp.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
                ELSE 'scheduled'
              END AS calendar_status
       FROM pm_plans pp
       LEFT JOIN assets a ON pp.asset_id = a.id
       LEFT JOIN users u ON pp.responsible_person = u.id
       WHERE pp.is_active = true
         AND pp.next_due_date <= CURRENT_DATE + INTERVAL '3 months'
       ORDER BY pp.next_due_date ASC`
    );

    // Group by month for calendar view
    const calendar: Record<string, any[]> = {};
    for (const row of result.rows) {
      if (row.next_due_date) {
        const key = row.next_due_date.toISOString().slice(0, 7); // YYYY-MM
        if (!calendar[key]) calendar[key] = [];
        calendar[key].push(row);
      }
    }

    res.json({ calendar, raw: result.rows });
  } catch (err) {
    console.error('PM calendar error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pm/upcoming  -- next 30 days
router.get('/upcoming', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT pp.*,
              a.asset_name, a.asset_id AS asset_code,
              u.full_name AS responsible_person_name
       FROM pm_plans pp
       LEFT JOIN assets a ON pp.asset_id = a.id
       LEFT JOIN users u ON pp.responsible_person = u.id
       WHERE pp.is_active = true
         AND pp.next_due_date >= CURRENT_DATE
         AND pp.next_due_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY pp.next_due_date ASC`
    );

    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('PM upcoming error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/pm/overdue
router.get('/overdue', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT pp.*,
              a.asset_name, a.asset_id AS asset_code,
              u.full_name AS responsible_person_name,
              CURRENT_DATE - pp.next_due_date AS days_overdue
       FROM pm_plans pp
       LEFT JOIN assets a ON pp.asset_id = a.id
       LEFT JOIN users u ON pp.responsible_person = u.id
       WHERE pp.is_active = true
         AND pp.next_due_date < CURRENT_DATE
       ORDER BY pp.next_due_date ASC`
    );

    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('PM overdue error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
