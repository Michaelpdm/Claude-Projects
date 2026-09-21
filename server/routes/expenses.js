const express = require('express');
const router = express.Router();
const pool = require('../database');

const CATEGORIES = ['Stock Purchase', 'Rent', 'Transport', 'Salary', 'Utilities', 'Marketing', 'General'];

router.get('/categories', (req, res) => res.json(CATEGORIES));

router.get('/', async (req, res) => {
  try {
    const { month } = req.query;
    let sql = 'SELECT * FROM expenses';
    const params = [];
    if (month) {
      sql += ' WHERE DATE_TRUNC(\'month\', expense_date) = DATE_TRUNC(\'month\', $1::date)';
      params.push(month);
    }
    sql += ' ORDER BY expense_date DESC, created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req, res) => {
  try {
    const [thisMonth, thisWeek, today] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount),0) as total, COUNT(*) as count FROM expenses WHERE DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)`),
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date >= DATE_TRUNC('week', CURRENT_DATE)`),
      pool.query(`SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date = CURRENT_DATE`),
      ]);
    const byCategory = await pool.query(`
      SELECT category, COALESCE(SUM(amount),0) as total
      FROM expenses WHERE DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY category ORDER BY total DESC
    `);
    res.json({
      today: today.rows[0].total,
      thisWeek: thisWeek.rows[0].total,
      thisMonth: { total: thisMonth.rows[0].total, count: parseInt(thisMonth.rows[0].count) },
      byCategory: byCategory.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { description, amount, category, expense_date, notes } = req.body;
    if (!description || !amount) return res.status(400).json({ error: 'Description and amount required' });
    const { rows } = await pool.query(
      'INSERT INTO expenses (description, amount, category, expense_date, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [description, parseFloat(amount), category || 'General', expense_date || new Date().toISOString().split('T')[0], notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { description, amount, category, expense_date, notes } = req.body;
    const { rows } = await pool.query(
      'UPDATE expenses SET description=$1, amount=$2, category=$3, expense_date=$4, notes=$5 WHERE id=$6 RETURNING *',
      [description, parseFloat(amount), category, expense_date, notes || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
