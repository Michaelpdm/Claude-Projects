import { Router } from 'express';
import { query } from '../db.js';
import { requireRole, wrap } from '../http.js';

const router = Router();
router.use(requireRole('manager'));

const LAGOS_NOW = `(now() AT TIME ZONE 'Africa/Lagos')`;
// Start of the chosen period, as a timestamptz (Lagos calendar)
const PERIOD_START = {
  today: `date_trunc('day', ${LAGOS_NOW}) AT TIME ZONE 'Africa/Lagos'`,
  week: `date_trunc('week', ${LAGOS_NOW}) AT TIME ZONE 'Africa/Lagos'`,
  month: `date_trunc('month', ${LAGOS_NOW}) AT TIME ZONE 'Africa/Lagos'`,
  year: `date_trunc('year', ${LAGOS_NOW}) AT TIME ZONE 'Africa/Lagos'`,
};

router.get('/pl', wrap(async (req, res) => {
  const start = PERIOD_START[req.query.period] || PERIOD_START.month;
  const [sales, cost, returned, expenses, refunds] = await Promise.all([
    query(`SELECT COALESCE(SUM(sale_price*quantity - discount),0) AS revenue, COUNT(*) AS transactions FROM sales WHERE created_at >= ${start}`),
    query(`SELECT COALESCE(SUM(p.cost*s.quantity),0) AS cogs FROM sales s JOIN products p ON s.product_id = p.id WHERE s.created_at >= ${start}`),
    query(`SELECT COALESCE(SUM(p.cost*r.quantity),0) AS c FROM returns r JOIN products p ON r.product_id = p.id WHERE r.created_at >= ${start}`),
    query(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE expense_date >= (${start} AT TIME ZONE 'Africa/Lagos')::date`),
    query(`SELECT COALESCE(SUM(refund_amount),0) AS total FROM returns WHERE created_at >= ${start}`),
  ]);
  const revenue = sales.rows[0].revenue;
  const cogs = cost.rows[0].cogs - returned.rows[0].c; // returned items go back on the shelf
  const exp = expenses.rows[0].total;
  const refunded = refunds.rows[0].total;
  const grossProfit = revenue - refunded - cogs;
  const netProfit = grossProfit - exp;
  res.json({
    revenue, cogs, grossProfit, expenses: exp, refunds: refunded, netProfit,
    transactions: sales.rows[0].transactions,
    margin: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
  });
}));

router.get('/bestsellers', wrap(async (_req, res) => {
  const { rows } = await query(`
    SELECT p.id, p.name, p.category, p.size, p.color, p.price, p.stock_quantity,
           COALESCE(SUM(s.quantity), 0) AS units_sold,
           COALESCE(SUM(s.sale_price*s.quantity - s.discount), 0) AS revenue
    FROM products p LEFT JOIN sales s ON s.product_id = p.id
    GROUP BY p.id ORDER BY units_sold DESC, p.name LIMIT 10`);
  res.json(rows);
}));

// CSV helpers. Cells starting with = + - @ are prefixed so spreadsheets don't run them as formulas.
const cell = (v) => {
  let s = v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};
const sendCsv = (res, name, header, rows) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${name}.csv`);
  res.send([header.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n'));
};

router.get('/export/sales', wrap(async (_req, res) => {
  const { rows } = await query(`
    SELECT s.created_at, p.name, p.category, p.size, p.color, s.quantity, s.sale_price, s.discount,
           (s.sale_price*s.quantity - s.discount) AS total, s.customer_name, s.payment_method
    FROM sales s LEFT JOIN products p ON s.product_id = p.id ORDER BY s.created_at DESC`);
  sendCsv(res, 'sales', ['Date', 'Product', 'Category', 'Size', 'Color', 'Qty', 'Unit Price', 'Discount', 'Total', 'Customer', 'Payment'],
    rows.map((r) => [r.created_at, r.name, r.category, r.size, r.color, r.quantity, r.sale_price, r.discount, r.total, r.customer_name, r.payment_method]));
}));

router.get('/export/products', wrap(async (_req, res) => {
  const { rows } = await query('SELECT name, category, size, color, price, cost, stock_quantity FROM products ORDER BY name');
  sendCsv(res, 'products', ['Name', 'Category', 'Size', 'Color', 'Price', 'Cost', 'Stock'],
    rows.map((r) => [r.name, r.category, r.size, r.color, r.price, r.cost, r.stock_quantity]));
}));

router.get('/export/customers', wrap(async (_req, res) => {
  const { rows } = await query(`
    SELECT c.name, c.phone, c.notes, COUNT(s.id) AS purchases,
           COALESCE(SUM(s.sale_price*s.quantity - s.discount),0) AS total_spent, c.created_at
    FROM customers c LEFT JOIN sales s ON s.customer_id = c.id GROUP BY c.id ORDER BY c.name`);
  sendCsv(res, 'customers', ['Name', 'Phone', 'Notes', 'Purchases', 'Total Spent', 'Joined'],
    rows.map((r) => [r.name, r.phone, r.notes, r.purchases, r.total_spent, r.created_at]));
}));

export default router;
