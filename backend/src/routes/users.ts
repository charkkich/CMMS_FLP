import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { BCRYPT_ROUNDS } from '../config/auth';

const router = Router();

// All user management routes require admin role
const adminOnly = [authenticate, authorize('admin')];

// GET /api/users
router.get('/', ...adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { role, is_active, search, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (role) { conditions.push(`role = $${idx++}`); params.push(role); }
    if (is_active !== undefined) { conditions.push(`is_active = $${idx++}`); params.push(is_active === 'true'); }
    if (search) {
      conditions.push(`(username ILIKE $${idx} OR full_name ILIKE $${idx} OR email ILIKE $${idx} OR department ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataRes, countRes] = await Promise.all([
      query(
        `SELECT id, username, email, full_name, role, department, phone, is_active, created_at, updated_at
         FROM users
         ${whereClause}
         ORDER BY full_name ASC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limitNum, offset]
      ),
      query(`SELECT COUNT(*) FROM users ${whereClause}`, params),
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
    console.error('List users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/technicians  -- shortcut for assigning WOs
router.get('/technicians', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, username, full_name, department, phone
       FROM users
       WHERE role IN ('technician', 'supervisor') AND is_active = true
       ORDER BY full_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List technicians error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users
router.post('/', ...adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, full_name, role, department, phone } = req.body;

    if (!username || !email || !password || !full_name || !role) {
      return res.status(400).json({ message: 'Username, email, password, full_name, and role are required' });
    }

    if (!['admin', 'supervisor', 'technician', 'requester'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, department, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, username, email, full_name, role, department, phone, is_active, created_at`,
      [username, email, password_hash, full_name, role, department, phone]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      const field = err.detail?.includes('username') ? 'Username' : 'Email';
      return res.status(409).json({ message: `${field} already exists` });
    }
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:id
router.get('/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, username, email, full_name, role, department, phone, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, full_name, role, department, phone, is_active, password } = req.body;

    let passwordUpdate = '';
    const params: any[] = [username, email, full_name, role, department, phone, is_active];

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      passwordUpdate = ', password_hash = $8';
      params.push(hash);
    }

    params.push(req.params.id);
    const idIdx = params.length;

    const result = await query(
      `UPDATE users SET
         username = COALESCE($1, username),
         email = COALESCE($2, email),
         full_name = COALESCE($3, full_name),
         role = COALESCE($4, role),
         department = COALESCE($5, department),
         phone = COALESCE($6, phone),
         is_active = COALESCE($7, is_active)
         ${passwordUpdate},
         updated_at = NOW()
       WHERE id = $${idIdx}
       RETURNING id, username, email, full_name, role, department, phone, is_active, updated_at`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      const field = err.detail?.includes('username') ? 'Username' : 'Email';
      return res.status(409).json({ message: `${field} already exists` });
    }
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/users/:id  -- soft delete
router.delete('/:id', ...adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    // Prevent self-deletion
    if (parseInt(req.params.id) === req.user!.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const result = await query(
      `UPDATE users SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, full_name, is_active`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated', ...result.rows[0] });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:id/activate  -- re-activate user
router.put('/:id/activate', ...adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `UPDATE users SET is_active = true, updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, full_name, is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User activated', ...result.rows[0] });
  } catch (err) {
    console.error('Activate user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
