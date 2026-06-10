import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Generate request number: MR-YYYYMM-XXXX
async function generateRequestNumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const res = await query(
    `SELECT COUNT(*) FROM maintenance_requests
     WHERE TO_CHAR(created_at, 'YYYYMM') = $1`,
    [ym]
  );
  const seq = parseInt(res.rows[0].count) + 1;
  return `MR-${ym}-${String(seq).padStart(4, '0')}`;
}

// Generate WO number: WO-YYYYMM-XXXX
async function generateWONumber(): Promise<string> {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const res = await query(
    `SELECT COUNT(*) FROM work_orders WHERE TO_CHAR(created_at, 'YYYYMM') = $1`,
    [ym]
  );
  const seq = parseInt(res.rows[0].count) + 1;
  return `WO-${ym}-${String(seq).padStart(4, '0')}`;
}

// GET /api/requests
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, date_from, date_to, search, page = '1', limit = '20', requester_id } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    // Requesters can only see their own requests
    if (req.user!.role === 'requester') {
      conditions.push(`mr.requester_id = $${idx++}`);
      params.push(req.user!.id);
    } else if (requester_id) {
      conditions.push(`mr.requester_id = $${idx++}`);
      params.push(requester_id);
    }

    if (status) {
      conditions.push(`mr.status = $${idx++}`);
      params.push(status);
    }
    if (priority) {
      conditions.push(`mr.priority = $${idx++}`);
      params.push(priority);
    }
    if (date_from) {
      conditions.push(`mr.request_date >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`mr.request_date <= $${idx++}`);
      params.push(date_to);
    }
    if (search) {
      conditions.push(`(mr.request_number ILIKE $${idx} OR mr.problem_description ILIKE $${idx} OR mr.location ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
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
         ORDER BY mr.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(
        `SELECT COUNT(*) FROM maintenance_requests mr ${whereClause}`,
        params
      ),
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
    console.error('List requests error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/requests
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      department, location, asset_id, priority,
      problem_description, photos = [], attachments = [],
    } = req.body;

    if (!priority || !problem_description) {
      return res.status(400).json({ message: 'Priority and problem description are required' });
    }

    const request_number = await generateRequestNumber();
    const requester_id = req.user!.id;

    const result = await query(
      `INSERT INTO maintenance_requests
         (request_number, requester_id, department, location, asset_id, priority,
          problem_description, photos, attachments, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Submitted')
       RETURNING *`,
      [request_number, requester_id, department, location, asset_id || null,
       priority, problem_description,
       JSON.stringify(photos), JSON.stringify(attachments)]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/requests/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT mr.*,
              u.full_name AS requester_name, u.email AS requester_email, u.phone AS requester_phone,
              a.asset_name, a.asset_id AS asset_code, a.location AS asset_location,
              ab.full_name AS approver_name
       FROM maintenance_requests mr
       LEFT JOIN users u ON mr.requester_id = u.id
       LEFT JOIN assets a ON mr.asset_id = a.id
       LEFT JOIN users ab ON mr.approved_by = ab.id
       WHERE mr.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const row = result.rows[0];
    // Requesters can only see their own
    if (req.user!.role === 'requester' && row.requester_id !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(row);
  } catch (err) {
    console.error('Get request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/requests/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await query('SELECT * FROM maintenance_requests WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Request not found' });

    const row = existing.rows[0];
    // Only requester (own) or admin/supervisor can edit; only if still Submitted
    if (req.user!.role === 'requester') {
      if (row.requester_id !== req.user!.id) return res.status(403).json({ message: 'Access denied' });
      if (row.status !== 'Submitted') return res.status(400).json({ message: 'Cannot edit after submission is processed' });
    }

    const {
      department, location, asset_id, priority,
      problem_description, photos, attachments,
    } = req.body;

    const result = await query(
      `UPDATE maintenance_requests SET
         department = COALESCE($1, department),
         location = COALESCE($2, location),
         asset_id = COALESCE($3, asset_id),
         priority = COALESCE($4, priority),
         problem_description = COALESCE($5, problem_description),
         photos = COALESCE($6::jsonb, photos),
         attachments = COALESCE($7::jsonb, attachments),
         updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [department, location, asset_id || null, priority, problem_description,
       photos ? JSON.stringify(photos) : null,
       attachments ? JSON.stringify(attachments) : null,
       req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/requests/:id/approve  -- supervisor/admin
router.put('/:id/approve', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  const client = await (await import('../config/database')).pool.connect();
  try {
    await client.query('BEGIN');

    const reqRes = await client.query('SELECT * FROM maintenance_requests WHERE id = $1', [req.params.id]);
    if (reqRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Request not found' });
    }

    const mr = reqRes.rows[0];
    if (mr.status !== 'Submitted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Cannot approve request with status: ${mr.status}` });
    }

    // Update request to Approved
    await client.query(
      `UPDATE maintenance_requests
       SET status = 'Approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [req.user!.id, req.params.id]
    );

    // Auto-create Work Order
    const {
      assigned_technician, supervisor_id, title, work_description,
      start_date, due_date, priority,
    } = req.body;

    const wo_number = await generateWONumber();

    const woRes = await client.query(
      `INSERT INTO work_orders
         (wo_number, request_id, asset_id, assigned_technician, supervisor_id,
          title, work_description, start_date, due_date, priority, type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Corrective','Open')
       RETURNING *`,
      [
        wo_number, mr.id, mr.asset_id,
        assigned_technician || null, supervisor_id || req.user!.id,
        title || `Work Order for ${mr.request_number}`,
        work_description || mr.problem_description,
        start_date || null, due_date || null,
        priority || mr.priority,
      ]
    );

    // Mark request as converted
    await client.query(
      `UPDATE maintenance_requests SET status = 'Converted to Work Order', updated_at = NOW() WHERE id = $1`,
      [mr.id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Request approved and work order created',
      work_order: woRes.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve request error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// PUT /api/requests/:id/reject  -- supervisor/admin
router.put('/:id/reject', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const { rejection_reason } = req.body;
    if (!rejection_reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const existing = await query('SELECT * FROM maintenance_requests WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Request not found' });

    if (existing.rows[0].status !== 'Submitted') {
      return res.status(400).json({ message: `Cannot reject request with status: ${existing.rows[0].status}` });
    }

    const result = await query(
      `UPDATE maintenance_requests
       SET status = 'Rejected', rejection_reason = $1,
           approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [rejection_reason, req.user!.id, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/requests/:id  -- admin only
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM maintenance_requests WHERE id = $1 RETURNING id, request_number',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Request not found' });
    res.json({ message: 'Request deleted', ...result.rows[0] });
  } catch (err) {
    console.error('Delete request error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
