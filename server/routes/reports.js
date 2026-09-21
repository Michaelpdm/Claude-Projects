const express = require('express');
const router = express.Router();
const pool = require('../database');

// Profit & Loss
router.get('/pl', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFilter;
    if (period === 'today') dateFilter = `DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE`;
    else if (period === 'week') dateFilter = `created_at >= DATE_TRUNC('week', NOW())`;
    else if (period === 'year') dateFilter = `created_at >= DATE_TRUNC('year', NOW())`;
    else dateFilter = `created_at >= DATE_TRUNC('month', NOW())`;

    let expenseDateFilter;
    if (period === 'today') expenseDateFilter = `expense_date = CURRENT_DATE`;
    else if (period === 'week') expenseDateFilter = `expense_date >= DATE_TRUNC('week', CURRENT_DATE)`;
    else if (period === 'year') expenseDateFilter = `expense_date >= DATE_TRUNC('year', CURRENT_DATE)`;
    else expenseDateFilter = `expense_date >= DATE_TRUNC('month', CURRENT_DATE)`;

    const [salesData, costData, expensesData, returnsData] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(sale_price * quantity - COALESCE(discount,0)), 0) as revenue, COUNT(*) as transactions FROM sales WHERE ${dateFilter}`),
      pool.query(`SELECT COALESCE(SUM(p.cost * s.quantity), 0) as cogs FROM sales s JOIN products p ON s.product_id = p.id WHERE ${dateFilter}`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE ${expenseDateFilter}`),
      pool.query(`SELECT COALESCE(SUM(refund_amount), 0) as total FROM returns WHERE ${dateFilter}`),
    ]);

    const revenue = parseFloat(salesData.rows[0].revenue);
    const cogs = parseFloat(costData.rows[0].cogs);
    const expenses = parseFloat(expensesData.rows[0].total);
    const refunds = parseFloat(returnsData.rows[0].total);
    const grossProfit = revenue - cogs - refunds;
    const netProfit = grossProfit - expenses;

    res.json({
      revenue, cogs, grossProfit, expenses, refunds, netProfit,
      transactions: parseInt(salesData.rows[0].transactions),
      margin: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Best sellers
router.get('/bestsellers', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.id, p.name, p.category, p.size, p.color, p.price, p.stock_quantity,
             COALESCE(SUM(s.quantity), 0) as units_sold,
             COALESCE(SUM(s.sale_price * s.quantity), 0) as revenue
      FROM products p
      LEFT JOIN sales s ON s.product_id = p.id
      GROUP BY p.id ORDER BY units_sold DESC LIMIT 10
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CSV export - sales
router.get('/export/sales', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.created_at, p.name as product, p.category, p.size, p.color,
             s.quantity, s.sale_price, s.discount,
             (s.sale_price * s.quantity - COALESCE(s.discount,0)) as total,
             s.customer_name, s.payment_method
      FROM sales s LEFT JOIN products p ON s.product_id = p.id
      ORDER BY s.created_at DESC
    `);
    const header = 'Date,Product,Category,Size,Color,Qty,Unit Price,Discount,Total,Customer,Payment\n';
    const csv = rows.map(r =>
      `"${new Date(r.created_at).toLocaleDateString()}","${r.product||''}","${r.category||''}","${r.size||''}","${r.color||''}",${r.quantity},${r.sale_price},${r.discount||0},${r.total},"${r.customer_name||''}","${r.payment_method}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales.csv');
    res.send(header + csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CSV export - products
router.get('/export/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY name');
    const header = 'Name,Category,Size,Color,Price,Cost,Stock\n';
    const csv = rows.map(r =>
      `"${r.name}","${r.category||''}","${r.size||''}","${r.color||''}",${r.price},${r.cost||0},${r.stock_quantity}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(header + csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// CSV export - customers
router.get('/export/customers', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.name, c.phone, c.notes, COUNT(s.id) as purchases,
             COALESCE(SUM(s.sale_price * s.quantity),0) as total_spent, c.created_at
      FROM customers c LEFT JOIN sales s ON s.customer_id = c.id
      GROUP BY c.id ORDER BY c.name
    `);
    const header = 'Name,Phone,Notes,Purchases,Total Spent,Joined\n';
    const csv = rows.map(r =>
      `"${r.name}","${r.phone||''}","${r.notes||''}",${r.purchases},${r.total_spent},"${new Date(r.created_at).toLocaleDateString()}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(header + csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
