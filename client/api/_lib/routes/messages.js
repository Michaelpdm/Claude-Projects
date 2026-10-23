import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, requireRole, wrap } from '../http.js';

export const messages = Router();
export const whatsapp = Router();

messages.use(requireRole('owner'));

messages.get('/', wrap(async (_req, res) => {
  const { rows } = await query(`
    SELECT m.phone_number, COUNT(*) AS message_count, MAX(m.created_at) AS last_message_time,
      (SELECT message_text FROM messages x WHERE x.phone_number = m.phone_number ORDER BY created_at DESC, id DESC LIMIT 1) AS last_message,
      (SELECT direction   FROM messages x WHERE x.phone_number = m.phone_number ORDER BY created_at DESC, id DESC LIMIT 1) AS last_direction
    FROM messages m GROUP BY m.phone_number ORDER BY last_message_time DESC`);
  res.json(rows);
}));

messages.get('/:phone', wrap(async (req, res) => {
  const { rows } = await query('SELECT * FROM messages WHERE phone_number = $1 ORDER BY created_at ASC, id ASC', [req.params.phone]);
  res.json(rows);
}));

// WhatsApp connection (Cloud API) is built in a later step. These keep the Settings screen honest in the meantime.
whatsapp.use(requireRole('owner'));
whatsapp.get('/status', (_req, res) => res.json({ status: 'disconnected' }));
whatsapp.get('/qr', (_req, res) => res.json({ qr: null, status: 'disconnected' }));
whatsapp.post('/connect', () => { throw new HttpError(501, 'WhatsApp is not connected yet. Live WhatsApp replies are the next feature to be built.'); });
whatsapp.post('/disconnect', (_req, res) => res.json({ success: true }));
