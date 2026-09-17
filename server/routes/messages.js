const express = require('express');
const router = express.Router();
const pool = require('../database');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT phone_number,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_time,
        (SELECT message_text FROM messages m2
         WHERE m2.phone_number = m.phone_number ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT direction FROM messages m3
         WHERE m3.phone_number = m.phone_number ORDER BY created_at DESC LIMIT 1) as last_direction
      FROM messages m
      GROUP BY phone_number ORDER BY last_message_time DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:phone', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM messages WHERE phone_number = $1 ORDER BY created_at ASC',
      [req.params.phone]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
