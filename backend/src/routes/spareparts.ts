import { Router, Response } from 'express';
import { query, pool } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/spare-parts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category, search, stock_status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
    if (stock_status === 'low') {
      conditions.push(`current_stock <= minimum_stock AND minimum_stock > 0`);
    } else if (stock_status === 'out') {
      conditions.push(`current_stock = 0`);
    } else if (stock_status === 'ok') {
      conditions.push(`current_stock > minimum_stock`);
    }
    if (search) {
      conditions.push(`(part_number ILIKE $${idx} OR part_name ILIKE $${idx} OR category ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT *,
                CASE
                  WHEN current_stock = 0 THEN 'out_of_stock'
                  WHEN current_stock <= minimum_stock AND minimum_stock > 0 THEN 'low_stock'
                  ELSE 'in_stock'
                END AS stock_status,
                (current_stock * unit_cost) AS total_value
         FROM spare_parts
         ${whereClause}
         ORDER BY part_name ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(`SELECT COUNT(*) FROM spare_parts ${whereClause}`, params),
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
    console.error('List spare parts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/spare-parts
router.post('/', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      part_number, part_name, category, unit, current_stock = 0,
      minimum_stock = 0, storage_location, unit_cost, description,
    } = req.body;

    if (!part_number || !part_name) {
      return res.status(400).json({ message: 'Part number and name are required' });
    }

    const result = await query(
      `INSERT INTO spare_parts
         (part_number, part_name, category, unit, current_stock,
          minimum_stock, storage_location, unit_cost, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        part_number, part_name, category, unit, current_stock,
        minimum_stock, storage_location, unit_cost || null, description,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Part number already exists' });
    }
    console.error('Create spare part error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/spare-parts/low-stock
router.get('/low-stock', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT *,
              (minimum_stock - current_stock) AS shortage,
              CASE
                WHEN current_stock = 0 THEN 'out_of_stock'
                ELSE 'low_stock'
              END AS stock_status
       FROM spare_parts
       WHERE current_stock <= minimum_stock AND minimum_stock > 0
       ORDER BY (minimum_stock - current_stock) DESC, part_name ASC`
    );
    res.json({ count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Low stock error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/spare-parts/transactions
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      part_id, transaction_type, work_order_id,
      date_from, date_to, page = '1', limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (part_id) { conditions.push(`st.part_id = $${idx++}`); params.push(part_id); }
    if (transaction_type) { conditions.push(`st.transaction_type = $${idx++}`); params.push(transaction_type); }
    if (work_order_id) { conditions.push(`st.work_order_id = $${idx++}`); params.push(work_order_id); }
    if (date_from) { conditions.push(`st.transaction_date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`st.transaction_date <= $${idx++}`); params.push(date_to); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT st.*,
                sp.part_name, sp.part_number, sp.unit,
                u.full_name AS performed_by_name,
                wo.wo_number
         FROM stock_transactions st
         JOIN spare_parts sp ON st.part_id = sp.id
         LEFT JOIN users u ON st.performed_by = u.id
         LEFT JOIN work_orders wo ON st.work_order_id = wo.id
         ${whereClause}
         ORDER BY st.transaction_date DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(`SELECT COUNT(*) FROM stock_transactions st ${whereClause}`, params),
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
    console.error('List transactions error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/spare-parts/transactions
router.post('/transactions', authenticate, authorize('admin', 'supervisor', 'technician'), async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      part_id, transaction_type, quantity,
      reference_number, work_order_id, remark,
    } = req.body;

    if (!part_id || !transaction_type || quantity === undefined) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Part ID, transaction type, and quantity are required' });
    }

    if (!['Receive', 'Issue', 'Adjustment'].includes(transaction_type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    // Lock row for update
    const partRes = await client.query(
      'SELECT * FROM spare_parts WHERE id = $1 FOR UPDATE',
      [part_id]
    );
    if (partRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Spare part not found' });
    }

    const part = partRes.rows[0];
    let newStock: number;

    if (transaction_type === 'Receive') {
      newStock = part.current_stock + Math.abs(quantity);
    } else if (transaction_type === 'Issue') {
      newStock = part.current_stock - Math.abs(quantity);
      if (newStock < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: `Insufficient stock. Current: ${part.current_stock}, Requested: ${Math.abs(quantity)}`,
        });
      }
    } else {
      // Adjustment: quantity can be positive or negative, or set to absolute value
      newStock = quantity >= 0 ? quantity : Math.max(0, part.current_stock + quantity);
    }

    // Update stock
    await client.query(
      'UPDATE spare_parts SET current_stock = $1, updated_at = NOW() WHERE id = $2',
      [newStock, part_id]
    );

    // Create transaction record
    const txRes = await client.query(
      `INSERT INTO stock_transactions
         (part_id, transaction_type, quantity, reference_number,
          work_order_id, performed_by, remark, balance_after)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        part_id, transaction_type, Math.abs(quantity),
        reference_number || null, work_order_id || null,
        req.user!.id, remark, newStock,
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      transaction: txRes.rows[0],
      new_stock: newStock,
      part_name: part.part_name,
      part_number: part.part_number,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create transaction error:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/spare-parts/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [partRes, txRes] = await Promise.all([
      query('SELECT * FROM spare_parts WHERE id = $1', [req.params.id]),
      query(
        `SELECT st.*,
                u.full_name AS performed_by_name,
                wo.wo_number
         FROM stock_transactions st
         LEFT JOIN users u ON st.performed_by = u.id
         LEFT JOIN work_orders wo ON st.work_order_id = wo.id
         WHERE st.part_id = $1
         ORDER BY st.transaction_date DESC
         LIMIT 20`,
        [req.params.id]
      ),
    ]);

    if (partRes.rows.length === 0) return res.status(404).json({ message: 'Spare part not found' });

    const part = partRes.rows[0];
    res.json({
      ...part,
      stock_status:
        part.current_stock === 0 ? 'out_of_stock'
        : part.current_stock <= part.minimum_stock && part.minimum_stock > 0 ? 'low_stock'
        : 'in_stock',
      recent_transactions: txRes.rows,
    });
  } catch (err) {
    console.error('Get spare part error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/spare-parts/:id
router.put('/:id', authenticate, authorize('admin', 'supervisor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      part_number, part_name, category, unit,
      minimum_stock, storage_location, unit_cost, description,
    } = req.body;

    const result = await query(
      `UPDATE spare_parts SET
         part_number = COALESCE($1, part_number),
         part_name = COALESCE($2, part_name),
         category = COALESCE($3, category),
         unit = COALESCE($4, unit),
         minimum_stock = COALESCE($5, minimum_stock),
         storage_location = COALESCE($6, storage_location),
         unit_cost = COALESCE($7, unit_cost),
         description = COALESCE($8, description),
         updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [part_number, part_name, category, unit, minimum_stock, storage_location, unit_cost, description, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Spare part not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Part number already exists' });
    }
    console.error('Update spare part error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/spare-parts/:id  -- admin only
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM spare_parts WHERE id = $1 RETURNING id, part_number, part_name',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Spare part not found' });
    res.json({ message: 'Spare part deleted', ...result.rows[0] });
  } catch (err: any) {
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Cannot delete: part has associated transactions' });
    }
    console.error('Delete spare part error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
