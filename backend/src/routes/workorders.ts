import { Router, Response } from 'express';
import { query, pool } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/work-orders
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      status, priority, type, asset_id, technician_id,
      date_from, date_to, search, page = '1', limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    // Technicians see only their assigned WOs
    if (req.user!.role === 'technician') {
      conditions.push(`wo.assigned_technician = $${idx++}`);
      params.push(req.user!.id);
    } else if (technician_id) {
      conditions.push(`wo.assigned_technician = $${idx++}`);
      params.push(technician_id);
    }

    if (status) { conditions.push(`wo.status = $${idx++}`); params.push(status); }
    if (priority) { conditions.push(`wo.priority = $${idx++}`); params.push(priority); }
    if (type) { conditions.push(`wo.type = $${idx++}`); params.push(type); }
    if (asset_id) { conditions.push(`wo.asset_id = $${idx++}`); params.push(asset_id); }
    if (date_from) { conditions.push(`wo.created_at >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`wo.created_at <= $${idx++}`); params.push(date_to); }
    if (search) {
      conditions.push(`(wo.wo_number ILIKE $${idx} OR wo.title ILIKE $${idx} OR wo.work_description ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT wo.*,
                t.full_name AS technician_name,
                s.full_name AS supervisor_name,
                a.asset_name, a.asset_id AS asset_code,
                a.location AS asset_location
         FROM work_orders wo
         LEFT JOIN users t ON wo.assigned_technician = t.id
         LEFT JOIN users s ON wo.supervisor_id = s.id
         LEFT JOIN assets a ON wo.asset_id = a.id
         ${whereClause}
         ORDER BY
           CASE wo.status WHEN 'In Progress' THEN 1 WHEN 'Open' THEN 2 WHEN 'Waiting Spare Part' THEN 3 ELSE 4 END,
           CASE wo.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
           wo.due_date ASC NULLS LAST,
           wo.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(`SELECT COUNT(*) FROM work_orders wo ${whereClause}`, params),
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
    console.error('List WO error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/work-orders
router.post('/', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      asset_id, assigned_technician, supervisor_id, title, work_description,
      start_date, due_date, priority = 'Medium', type = 'Corrective',
      request_id, before_photos = [],
    } = req.body;

    if (!title) return res.status(400).json({ message: 'Title is required' });

    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cntRes = await query(
      `SELECT COUNT(*) FROM work_orders WHERE TO_CHAR(created_at, 'YYYYMM') = $1`, [ym]
    );
    const seq = parseInt(cntRes.rows[0].count) + 1;
    const wo_number = `WO-${ym}-${String(seq).padStart(4, '0')}`;

    const result = await query(
      `INSERT INTO work_orders
         (wo_number, request_id, asset_id, assigned_technician, supervisor_id,
          title, work_description, start_date, due_date, priority, type,
          before_photos, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Open')
       RETURNING *`,
      [
        wo_number, request_id || null, asset_id || null,
        assigned_technician || null, supervisor_id || req.user!.id,
        title, work_description || null,
        start_date || null, due_date || null,
        priority, type, JSON.stringify(before_photos),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create WO error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/work-orders/technician/:id
router.get('/technician/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Only the technician themselves, or admin/supervisor can access this
    if (req.user!.role === 'technician' && req.user!.id !== parseInt(req.params.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['wo.assigned_technician = $1'];
    const params: any[] = [req.params.id];
    let idx = 2;

    if (status) { conditions.push(`wo.status = $${idx++}`); params.push(status); }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT wo.*,
                s.full_name AS supervisor_name,
                a.asset_name, a.asset_id AS asset_code
         FROM work_orders wo
         LEFT JOIN users s ON wo.supervisor_id = s.id
         LEFT JOIN assets a ON wo.asset_id = a.id
         ${whereClause}
         ORDER BY
           CASE wo.status WHEN 'In Progress' THEN 1 WHEN 'Open' THEN 2 ELSE 3 END,
           CASE wo.priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 WHEN 'Medium' THEN 3 ELSE 4 END,
           wo.due_date ASC NULLS LAST
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(`SELECT COUNT(*) FROM work_orders wo ${whereClause}`, params),
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
    console.error('Technician WO error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/work-orders/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [woRes, partsRes] = await Promise.all([
      query(
        `SELECT wo.*,
                t.full_name AS technician_name, t.phone AS technician_phone,
                s.full_name AS supervisor_name,
                a.asset_name, a.asset_id AS asset_code, a.location AS asset_location,
                a.manufacturer, a.model AS asset_model,
                mr.request_number, mr.problem_description AS request_description
         FROM work_orders wo
         LEFT JOIN users t ON wo.assigned_technician = t.id
         LEFT JOIN users s ON wo.supervisor_id = s.id
         LEFT JOIN assets a ON wo.asset_id = a.id
         LEFT JOIN maintenance_requests mr ON wo.request_id = mr.id
         WHERE wo.id = $1`,
        [req.params.id]
      ),
      query(
        `SELECT wop.*, sp.part_name, sp.part_number, sp.unit, sp.unit_cost,
                (wop.quantity * sp.unit_cost) AS total_cost
         FROM work_order_parts wop
         JOIN spare_parts sp ON wop.part_id = sp.id
         WHERE wop.work_order_id = $1`,
        [req.params.id]
      ),
    ]);

    if (woRes.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });

    // Technician access check
    const wo = woRes.rows[0];
    if (req.user!.role === 'technician' && wo.assigned_technician !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ ...wo, parts_used: partsRes.rows });
  } catch (err) {
    console.error('Get WO error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/work-orders/:id
router.put('/:id', authenticate, authorize('admin', 'supervisor', 'technician'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await query('SELECT * FROM work_orders WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });

    const wo = existing.rows[0];
    // Technician can only update their own WO and only certain fields
    if (req.user!.role === 'technician' && wo.assigned_technician !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      title, work_description, assigned_technician, supervisor_id,
      start_date, due_date, priority, status,
      root_cause, corrective_action, labor_hours,
      before_photos, after_photos, parts_used,
    } = req.body;

    // Technicians cannot reassign or change priority
    const updateFields: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const addField = (field: string, value: any) => {
      if (value !== undefined) {
        updateFields.push(`${field} = $${idx++}`);
        params.push(value);
      }
    };

    if (req.user!.role !== 'technician') {
      addField('title', title);
      addField('assigned_technician', assigned_technician);
      addField('supervisor_id', supervisor_id);
      addField('priority', priority);
    }

    addField('work_description', work_description);
    addField('start_date', start_date);
    addField('due_date', due_date);
    addField('status', status);
    addField('root_cause', root_cause);
    addField('corrective_action', corrective_action);
    addField('labor_hours', labor_hours);

    if (before_photos !== undefined) {
      updateFields.push(`before_photos = $${idx++}`);
      params.push(JSON.stringify(before_photos));
    }
    if (after_photos !== undefined) {
      updateFields.push(`after_photos = $${idx++}`);
      params.push(JSON.stringify(after_photos));
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const result = await query(
      `UPDATE work_orders SET ${updateFields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    // Handle parts_used updates if provided
    if (parts_used && Array.isArray(parts_used)) {
      // Replace parts list
      await query('DELETE FROM work_order_parts WHERE work_order_id = $1', [req.params.id]);
      for (const part of parts_used) {
        await query(
          'INSERT INTO work_order_parts (work_order_id, part_id, quantity) VALUES ($1,$2,$3)',
          [req.params.id, part.part_id, part.quantity]
        );
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update WO error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/work-orders/:id/complete
router.put('/:id/complete', authenticate, authorize('admin', 'supervisor', 'technician'), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const woRes = await client.query('SELECT * FROM work_orders WHERE id = $1', [req.params.id]);
    if (woRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Work order not found' });
    }

    const wo = woRes.rows[0];
    if (req.user!.role === 'technician' && wo.assigned_technician !== req.user!.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Access denied' });
    }

    if (['Completed', 'Closed'].includes(wo.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Work order is already completed or closed' });
    }

    const {
      root_cause, corrective_action, labor_hours,
      after_photos = [], completion_date, parts_used = [],
    } = req.body;

    // Update WO
    const result = await client.query(
      `UPDATE work_orders SET
         status = 'Completed',
         completion_date = $1,
         root_cause = COALESCE($2, root_cause),
         corrective_action = COALESCE($3, corrective_action),
         labor_hours = COALESCE($4, labor_hours),
         after_photos = $5,
         updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        completion_date || new Date(),
        root_cause, corrective_action, labor_hours,
        JSON.stringify(after_photos),
        req.params.id,
      ]
    );

    // Handle parts used and stock deduction
    if (parts_used.length > 0) {
      await client.query('DELETE FROM work_order_parts WHERE work_order_id = $1', [req.params.id]);
      for (const part of parts_used) {
        await client.query(
          'INSERT INTO work_order_parts (work_order_id, part_id, quantity) VALUES ($1,$2,$3)',
          [req.params.id, part.part_id, part.quantity]
        );

        // Deduct stock
        const stockRes = await client.query(
          'SELECT current_stock FROM spare_parts WHERE id = $1 FOR UPDATE',
          [part.part_id]
        );
        if (stockRes.rows.length > 0) {
          const newStock = Math.max(0, stockRes.rows[0].current_stock - part.quantity);
          await client.query(
            'UPDATE spare_parts SET current_stock = $1, updated_at = NOW() WHERE id = $2',
            [newStock, part.part_id]
          );
          await client.query(
            `INSERT INTO stock_transactions
               (part_id, transaction_type, quantity, reference_number, work_order_id, performed_by, balance_after, remark)
             VALUES ($1,'Issue',$2,$3,$4,$5,$6,'Parts used in work order')`,
            [part.part_id, part.quantity, wo.wo_number, req.params.id, req.user!.id, newStock]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Work order completed', work_order: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Complete WO error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /api/work-orders/:id  -- admin only
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    // Clean up related records first
    await query('DELETE FROM work_order_parts WHERE work_order_id = $1', [req.params.id]);
    const result = await query(
      'DELETE FROM work_orders WHERE id = $1 RETURNING id, wo_number',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Work order not found' });
    res.json({ message: 'Work order deleted', ...result.rows[0] });
  } catch (err) {
    console.error('Delete WO error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
