import crypto from 'node:crypto';
import { Router } from 'express';
import { query, tx } from '../db.js';
import { HttpError, num, requireRole, wrap } from '../http.js';

const router = Router();
router.use(requireRole('staff'));

const METHODS = ['cash', 'transfer', 'pos', 'credit'];
const LAGOS_DAY = `(s.created_at AT TIME ZONE 'Africa/Lagos')::date = (now() AT TIME ZONE 'Africa/Lagos')::date`;
const NET = 's.sale_price * s.quantity - s.discount';

router.get('/', wrap(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const { rows } = await query(`
    SELECT s.*, p.name AS product_name, p.category, p.size, p.color
    FROM sales s LEFT JOIN products p ON s.product_id = p.id
    ORDER BY s.created_at DESC, s.id DESC LIMIT $1`, [limit]);
  res.json(rows);
}));

router.get('/summary', wrap(async (_req, res) => {
  const agg = (where) => query(`SELECT COALESCE(SUM(${NET}), 0) AS total, COUNT(*) AS count FROM sales s WHERE ${where}`);
  const [today, week, month] = await Promise.all([
    agg(LAGOS_DAY),
    agg(`s.created_at >= date_trunc('week', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos'`),
    agg(`s.created_at >= date_trunc('month', now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos'`),
  ]);
  res.json({
    today: { total: today.rows[0].total, count: today.rows[0].count },
    thisWeek: { total: week.rows[0].total, count: week.rows[0].count },
    thisMonth: { total: month.rows[0].total, count: month.rows[0].count },
  });
}));

router.get('/peak-hours', requireRole('manager'), wrap(async (_req, res) => {
  const { rows } = await query(`
    SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Africa/Lagos')::int AS hour, COUNT(*) AS count
    FROM sales WHERE created_at >= now() - interval '7 days' GROUP BY 1`);
  const map = Object.fromEntries(rows.map((r) => [r.hour, r.count]));
  res.json(Array.from({ length: 24 }, (_, h) => ({ hour: h, count: map[h] || 0 })));
}));

// Checkout: price comes from the product record, never from the client. Stock is locked and
// decremented in one transaction so two simultaneous sales cannot oversell.
async function checkout(body) {
  const { items, customer_name, customer_id } = body || {};
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Add at least one item');
  const method = String(body.payment_method || 'cash').toLowerCase();
  if (!METHODS.includes(method)) throw new HttpError(400, 'Unknown payment method');
  const discount = num(body.discount);
  if (discount < 0) throw new HttpError(400, 'Discount cannot be negative');
  if (method === 'credit' && !String(customer_name || '').trim()) throw new HttpError(400, 'Enter the customer name for a credit sale');

  const lines = new Map();
  for (const it of items) {
    const id = parseInt(it.product_id, 10);
    const qty = parseInt(it.quantity, 10);
    if (!id || !(qty >= 1)) throw new HttpError(400, 'Each item needs a product and a quantity of 1 or more');
    lines.set(id, (lines.get(id) || 0) + qty);
  }

  return tx(async (c) => {
    const ids = [...lines.keys()].sort((a, b) => a - b);
    const { rows: prods } = await c.query('SELECT * FROM products WHERE id = ANY($1) ORDER BY id FOR UPDATE', [ids]);
    if (prods.length !== ids.length) throw new HttpError(404, 'A product in the cart no longer exists');

    let subtotal = 0;
    for (const p of prods) {
      const qty = lines.get(p.id);
      if (p.stock_quantity < qty) throw new HttpError(400, `Only ${p.stock_quantity} of "${p.name}" in stock`);
      subtotal += p.price * qty;
    }
    if (discount > subtotal) throw new HttpError(400, 'Discount is more than the sale total');

    let cid = customer_id ? parseInt(customer_id, 10) : null;
    if (cid) {
      const ok = await c.query('SELECT 1 FROM customers WHERE id = $1', [cid]);
      if (!ok.rowCount) cid = null;
    }

    const orderRef = crypto.randomBytes(4).toString('hex').toUpperCase();
    const out = [];
    let allocated = 0;
    for (let i = 0; i < prods.length; i++) {
      const p = prods[i];
      const qty = lines.get(p.id);
      // share the discount across lines in proportion to their value; last line takes the rounding remainder
      const share = i === prods.length - 1 ? +(discount - allocated).toFixed(2) : subtotal ? +((discount * (p.price * qty)) / subtotal).toFixed(2) : 0;
      allocated += share;
      const { rows } = await c.query(
        `INSERT INTO sales (order_ref, product_id, customer_id, quantity, sale_price, discount, customer_name, payment_method)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [orderRef, p.id, cid, qty, p.price, share, customer_name || null, method]
      );
      await c.query('UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = now() WHERE id = $2', [qty, p.id]);
      out.push({ ...rows[0], product_name: p.name, unit_price: p.price });
    }

    if (method === 'credit') {
      await c.query(
        `INSERT INTO debits (customer_name, amount, description) VALUES ($1,$2,$3)`,
        [customer_name.trim(), +(subtotal - discount).toFixed(2), `Credit sale ${orderRef}`]
      );
    }
    return out;
  });
}

router.post('/bulk', wrap(async (req, res) => res.status(201).json(await checkout(req.body))));

router.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const rows = await checkout({ ...b, items: [{ product_id: b.product_id, quantity: b.quantity }], discount: b.discount });
  res.status(201).json(rows[0]);
}));

// Void a sale (manager+): puts the stock back.
router.delete('/:id', requireRole('manager'), wrap(async (req, res) => {
  await tx(async (c) => {
    const { rows } = await c.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [req.params.id]);
    const sale = rows[0];
    if (!sale) throw new HttpError(404, 'Sale not found');
    const ret = await c.query('SELECT COALESCE(SUM(quantity),0) AS q FROM returns WHERE sale_id = $1', [sale.id]);
    const restock = sale.quantity - ret.rows[0].q; // returned units were already restocked
    if (sale.product_id && restock > 0) {
      await c.query('UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = now() WHERE id = $2', [restock, sale.product_id]);
    }
    await c.query('DELETE FROM sales WHERE id = $1', [sale.id]);
  });
  res.json({ ok: true });
}));

export default router;
