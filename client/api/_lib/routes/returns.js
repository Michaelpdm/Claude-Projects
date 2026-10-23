import { Router } from 'express';
import { query, tx } from '../db.js';
import { HttpError, requireRole, wrap } from '../http.js';

const router = Router();

router.get('/', requireRole('manager'), wrap(async (_req, res) => {
  const { rows } = await query(`
    SELECT r.*, p.name AS product_name, s.customer_name, s.payment_method
    FROM returns r LEFT JOIN products p ON r.product_id = p.id LEFT JOIN sales s ON r.sale_id = s.id
    ORDER BY r.created_at DESC LIMIT 100`);
  res.json(rows);
}));

router.post('/', requireRole('staff'), wrap(async (req, res) => {
  const saleId = parseInt(req.body?.sale_id, 10);
  const qty = parseInt(req.body?.quantity, 10);
  if (!saleId || !(qty >= 1)) throw new HttpError(400, 'sale_id and a quantity of 1 or more are required');

  const row = await tx(async (c) => {
    const sale = (await c.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [saleId])).rows[0];
    if (!sale) throw new HttpError(404, 'Sale not found');
    const done = (await c.query('SELECT COALESCE(SUM(quantity),0) AS q FROM returns WHERE sale_id = $1', [saleId])).rows[0].q;
    const left = sale.quantity - done;
    if (qty > left) throw new HttpError(400, left > 0 ? `Only ${left} left to return on this sale` : 'This sale was already fully returned');
    // refund the price paid per unit (after that line's share of any discount)
    const refund = +(((sale.sale_price * sale.quantity - sale.discount) / sale.quantity) * qty).toFixed(2);
    const { rows } = await c.query(
      'INSERT INTO returns (sale_id, product_id, quantity, refund_amount, reason) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [saleId, sale.product_id, qty, refund, String(req.body.reason || '').trim() || null]
    );
    if (sale.product_id) {
      await c.query('UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = now() WHERE id = $2', [qty, sale.product_id]);
    }
    return rows[0];
  });
  res.status(201).json(row);
}));

export default router;
