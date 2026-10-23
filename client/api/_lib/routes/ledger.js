// Owner-only bookkeeping routes: expenses, debts, invoices.
import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, num, requireRole, wrap } from '../http.js';

export const expenses = Router();
export const debits = Router();
export const invoices = Router();
for (const r of [expenses, debits, invoices]) r.use(requireRole('owner'));

const CATEGORIES = ['Stock Purchase', 'Rent', 'Transport', 'Salary', 'Utilities', 'Marketing', 'General'];
const LAGOS_TODAY = `(now() AT TIME ZONE 'Africa/Lagos')::date`;
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

// ── Expenses ──
expenses.get('/categories', (_req, res) => res.json(CATEGORIES));

expenses.get('/', wrap(async (req, res) => {
  const { month } = req.query;
  if (month && !isDate(month)) throw new HttpError(400, 'month must be YYYY-MM-DD');
  const { rows } = month
    ? await query(`SELECT * FROM expenses WHERE date_trunc('month', expense_date) = date_trunc('month', $1::date) ORDER BY expense_date DESC, id DESC`, [month])
    : await query('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC');
  res.json(rows);
}));

expenses.get('/summary', wrap(async (_req, res) => {
  const sum = (where) => query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM expenses WHERE ${where}`);
  const [month, week, today, byCat] = await Promise.all([
    sum(`date_trunc('month', expense_date) = date_trunc('month', ${LAGOS_TODAY})`),
    sum(`expense_date >= date_trunc('week', ${LAGOS_TODAY})`),
    sum(`expense_date = ${LAGOS_TODAY}`),
    query(`SELECT category, SUM(amount) AS total FROM expenses
           WHERE date_trunc('month', expense_date) = date_trunc('month', ${LAGOS_TODAY}) GROUP BY category ORDER BY total DESC`),
  ]);
  res.json({
    today: today.rows[0].total,
    thisWeek: week.rows[0].total,
    thisMonth: { total: month.rows[0].total, count: month.rows[0].count },
    byCategory: byCat.rows,
  });
}));

function expenseFields(b) {
  const description = String(b?.description || '').trim();
  const amount = num(b?.amount, NaN);
  if (!description) throw new HttpError(400, 'Description is required');
  if (!(amount > 0)) throw new HttpError(400, 'Amount must be more than 0');
  if (b.expense_date && !isDate(b.expense_date)) throw new HttpError(400, 'Invalid date');
  return [description, amount, b.category || 'General', b.expense_date || null, String(b.notes || '').trim() || null];
}

expenses.post('/', wrap(async (req, res) => {
  const [d, a, c, date, n] = expenseFields(req.body);
  const { rows } = await query(
    `INSERT INTO expenses (description, amount, category, expense_date, notes) VALUES ($1,$2,$3,COALESCE($4::date, ${LAGOS_TODAY}),$5) RETURNING *`,
    [d, a, c, date, n]
  );
  res.status(201).json(rows[0]);
}));

expenses.put('/:id', wrap(async (req, res) => {
  const [d, a, c, date, n] = expenseFields(req.body);
  const { rows } = await query(
    `UPDATE expenses SET description=$1, amount=$2, category=$3, expense_date=COALESCE($4::date, expense_date), notes=$5 WHERE id=$6 RETURNING *`,
    [d, a, c, date, n, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Expense not found');
  res.json(rows[0]);
}));

expenses.delete('/:id', wrap(async (req, res) => {
  const { rowCount } = await query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Expense not found');
  res.json({ ok: true });
}));

// ── Debts ──
debits.get('/', wrap(async (_req, res) => res.json((await query('SELECT * FROM debits ORDER BY created_at DESC')).rows)));

debits.get('/summary', wrap(async (_req, res) => {
  const { rows } = await query(`SELECT COALESCE(SUM(amount),0) AS "totalOutstanding", COUNT(*) AS count FROM debits WHERE status = 'Pending'`);
  res.json(rows[0]);
}));

debits.post('/', wrap(async (req, res) => {
  const b = req.body || {};
  const name = String(b.customer_name || '').trim();
  const amount = num(b.amount, NaN);
  if (!name) throw new HttpError(400, 'Customer name is required');
  if (!(amount > 0)) throw new HttpError(400, 'Amount must be more than 0');
  if (b.date_due && !isDate(b.date_due)) throw new HttpError(400, 'Invalid due date');
  const { rows } = await query(
    'INSERT INTO debits (customer_name, amount, description, date_due, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, amount, b.description || null, b.date_due || null, b.notes || null]
  );
  res.status(201).json(rows[0]);
}));

const clearDebit = wrap(async (req, res) => {
  const { rows } = await query(`UPDATE debits SET status = 'Cleared' WHERE id = $1 RETURNING *`, [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Debt not found');
  res.json(rows[0]);
});
debits.post('/:id/clear', clearDebit);
debits.put('/:id/clear', clearDebit);

debits.delete('/:id', wrap(async (req, res) => {
  const { rowCount } = await query('DELETE FROM debits WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Debt not found');
  res.json({ ok: true });
}));

// ── Invoices ──
const STATUSES = ['Draft', 'Sent', 'Paid'];

invoices.get('/', wrap(async (_req, res) => res.json((await query('SELECT * FROM invoices ORDER BY created_at DESC')).rows)));

invoices.get('/:id', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Invoice not found');
  res.json(rows[0]);
}));

invoices.post('/', wrap(async (req, res) => {
  const name = String(req.body?.customer_name || '').trim();
  const items = req.body?.items;
  if (!name) throw new HttpError(400, 'Customer name is required');
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Add at least one line item');
  const clean = items.map((it) => ({
    description: String(it.description || '').trim(),
    quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
    unit_price: Math.max(0, num(it.unit_price)),
  }));
  if (clean.some((i) => !i.description)) throw new HttpError(400, 'Every line needs a description');
  const total = clean.reduce((t, i) => t + i.quantity * i.unit_price, 0); // total is always computed here, never trusted from the client
  const { rows } = await query(
    `INSERT INTO invoices (customer_name, items, total, status) VALUES ($1,$2::jsonb,$3,'Draft') RETURNING *`,
    [name, JSON.stringify(clean), total]
  );
  res.status(201).json(rows[0]);
}));

const setStatus = wrap(async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid status');
  const { rows } = await query('UPDATE invoices SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Invoice not found');
  res.json(rows[0]);
});
invoices.patch('/:id/status', setStatus);
invoices.put('/:id/status', setStatus);

invoices.delete('/:id', wrap(async (req, res) => {
  const { rowCount } = await query('DELETE FROM invoices WHERE id = $1', [req.params.id]);
  if (!rowCount) throw new HttpError(404, 'Invoice not found');
  res.json({ ok: true });
}));
