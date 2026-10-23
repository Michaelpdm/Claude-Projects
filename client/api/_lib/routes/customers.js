import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, requireRole, wrap } from '../http.js';

const router = Router();
router.use(requireRole('staff'));

const LINE_TOTAL = 's.sale_price * s.quantity - s.discount';

function parse(b) {
  const name = String(b?.name || '').trim();
  if (!name) throw new HttpError(400, 'Name required');
  return [name, String(b.phone || '').trim() || null, String(b.notes || '').trim() || null];
}

router.get('/', wrap(async (_req, res) => {
  const { rows } = await query(`
    SELECT c.*, COUNT(s.id) AS total_purchases, COALESCE(SUM(${LINE_TOTAL}), 0) AS total_spent
    FROM customers c LEFT JOIN sales s ON s.customer_id = c.id
    GROUP BY c.id ORDER BY c.name`);
  res.json(rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const customer = (await query('SELECT * FROM customers WHERE id = $1', [req.params.id])).rows[0];
  if (!customer) throw new HttpError(404, 'Customer not found');
  const { rows: purchases } = await query(`
    SELECT s.*, p.name AS product_name, p.category, p.size, p.color
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    WHERE s.customer_id = $1 ORDER BY s.created_at DESC`, [req.params.id]);
  res.json({ ...customer, purchases });
}));

router.post('/', requireRole('manager'), wrap(async (req, res) => {
  const { rows } = await query('INSERT INTO customers (name, phone, notes) VALUES ($1,$2,$3) RETURNING *', parse(req.body));
  res.status(201).json(rows[0]);
}));

router.put('/:id', requireRole('manager'), wrap(async (req, res) => {
  const { rows } = await query('UPDATE customers SET name=$1, phone=$2, notes=$3 WHERE id=$4 RETURNING *', [...parse(req.body), req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Customer not found');
  res.json(rows[0]);
}));

router.delete('/:id', requireRole('manager'), wrap(async (req, res) => {
  const { rowCount } = await query('DELETE FROM customers WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Customer not found');
  res.json({ ok: true });
}));

export default router;
