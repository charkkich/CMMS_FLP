import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/assets
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, category, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
    if (search) {
      conditions.push(`(asset_id ILIKE $${idx} OR asset_name ILIKE $${idx} OR location ILIKE $${idx} OR manufacturer ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT a.*,
                (SELECT COUNT(*) FROM work_orders WHERE asset_id = a.id) AS total_work_orders,
                (SELECT COUNT(*) FROM work_orders WHERE asset_id = a.id AND status NOT IN ('Completed','Closed')) AS active_work_orders,
                (SELECT COUNT(*) FROM pm_plans WHERE asset_id = a.id AND is_active = true) AS pm_plans_count
         FROM assets a
         ${whereClause}
         ORDER BY a.asset_name ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(`SELECT COUNT(*) FROM assets ${whereClause}`, params),
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
    console.error('List assets error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/assets
router.post('/', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      asset_id, asset_name, category, location, serial_number,
      manufacturer, model, purchase_date, warranty_expiry,
      status = 'Active', description,
    } = req.body;

    if (!asset_id || !asset_name || !category) {
      return res.status(400).json({ message: 'Asset ID, name, and category are required' });
    }

    const result = await query(
      `INSERT INTO assets
         (asset_id, asset_name, category, location, serial_number, manufacturer,
          model, purchase_date, warranty_expiry, status, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        asset_id, asset_name, category, location, serial_number,
        manufacturer, model,
        purchase_date || null, warranty_expiry || null,
        status, description,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Asset ID already exists' });
    }
    console.error('Create asset error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/assets/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM work_orders WHERE asset_id = a.id) AS total_work_orders,
              (SELECT COUNT(*) FROM work_orders WHERE asset_id = a.id AND type = 'Corrective') AS corrective_count,
              (SELECT COUNT(*) FROM work_orders WHERE asset_id = a.id AND type = 'Preventive') AS preventive_count,
              (SELECT SUM(labor_hours) FROM work_orders WHERE asset_id = a.id AND status IN ('Completed','Closed')) AS total_labor_hours,
              (SELECT COUNT(*) FROM pm_plans WHERE asset_id = a.id AND is_active = true) AS active_pm_plans
       FROM assets a
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Asset not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get asset error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/assets/:id
router.put('/:id', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      asset_id, asset_name, category, location, serial_number,
      manufacturer, model, purchase_date, warranty_expiry,
      status, description,
    } = req.body;

    const result = await query(
      `UPDATE assets SET
         asset_id = COALESCE($1, asset_id),
         asset_name = COALESCE($2, asset_name),
         category = COALESCE($3, category),
         location = COALESCE($4, location),
         serial_number = COALESCE($5, serial_number),
         manufacturer = COALESCE($6, manufacturer),
         model = COALESCE($7, model),
         purchase_date = COALESCE($8, purchase_date),
         warranty_expiry = COALESCE($9, warranty_expiry),
         status = COALESCE($10, status),
         description = COALESCE($11, description),
         updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        asset_id, asset_name, category, location, serial_number,
        manufacturer, model, purchase_date || null, warranty_expiry || null,
        status, description, req.params.id,
      ]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Asset not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Asset ID already exists' });
    }
    console.error('Update asset error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/assets/:id  -- admin only
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM assets WHERE id = $1 RETURNING id, asset_id, asset_name',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Asset not found' });
    res.json({ message: 'Asset deleted', ...result.rows[0] });
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Cannot delete asset: it has associated work orders or PM plans' });
    }
    console.error('Delete asset error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/assets/:id/history  -- repair / work order history
router.get('/:id/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT wo.*,
                t.full_name AS technician_name,
                s.full_name AS supervisor_name,
                mr.request_number
         FROM work_orders wo
         LEFT JOIN users t ON wo.assigned_technician = t.id
         LEFT JOIN users s ON wo.supervisor_id = s.id
         LEFT JOIN maintenance_requests mr ON wo.request_id = mr.id
         WHERE wo.asset_id = $1
         ORDER BY wo.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.params.id, limitNum, offset]
      ),
      query('SELECT COUNT(*) FROM work_orders WHERE asset_id = $1', [req.params.id]),
    ]);

    if (dataRes.rows.length === 0 && parseInt(req.params.id) > 0) {
      // Check asset exists
      const assetCheck = await query('SELECT id FROM assets WHERE id = $1', [req.params.id]);
      if (assetCheck.rows.length === 0) return res.status(404).json({ message: 'Asset not found' });
    }

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
    console.error('Asset history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/assets/:id/pm-history  -- PM history for asset
router.get('/:id/pm-history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const [plansRes, recordsRes] = await Promise.all([
      query(
        `SELECT pp.*,
                u.full_name AS responsible_person_name
         FROM pm_plans pp
         LEFT JOIN users u ON pp.responsible_person = u.id
         WHERE pp.asset_id = $1
         ORDER BY pp.next_due_date ASC`,
        [req.params.id]
      ),
      query(
        `SELECT pr.*,
                pp.title AS plan_title, pp.frequency,
                t.full_name AS technician_name,
                wo.wo_number
         FROM pm_records pr
         JOIN pm_plans pp ON pr.pm_plan_id = pp.id
         LEFT JOIN users t ON pr.technician_id = t.id
         LEFT JOIN work_orders wo ON pr.work_order_id = wo.id
         WHERE pp.asset_id = $1
         ORDER BY pr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.params.id, limitNum, offset]
      ),
    ]);

    res.json({
      plans: plansRes.rows,
      records: recordsRes.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error('Asset PM history error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
