const express = require('express');
const router = express.Router();
const db = require('../database');

let sock = null;
let qrCodeData = null;
let connectionStatus = 'disconnected';

async function startWhatsApp() {
  try {
    const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
    const { Boom } = require('@hapi/boom');
    const pino = require('pino');
    const qrcode = require('qrcode');
    const path = require('path');

    const authDir = path.join(__dirname, '../baileys_auth');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    sock = makeWASocket({
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      auth: state,
      generateHighQualityLinkPreview: false,
      browser: ['Clothing Store', 'Chrome', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrCodeData = await qrcode.toDataURL(qr);
        connectionStatus = 'qr_pending';
        console.log('[WhatsApp] QR code ready — scan in Settings page');
      }

      if (connection === 'close') {
        connectionStatus = 'disconnected';
        qrCodeData = null;
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut) {
          console.log('[WhatsApp] Reconnecting in 5s...');
          setTimeout(startWhatsApp, 5000);
        } else {
          console.log('[WhatsApp] Logged out. Scan QR again.');
        }
      } else if (connection === 'open') {
        connectionStatus = 'connected';
        qrCodeData = null;
        console.log('[WhatsApp] Connected successfully!');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue;

        const jid = msg.key.remoteJid;
        if (!jid || jid.endsWith('@g.us')) continue;

        const phone = jid.replace('@s.whatsapp.net', '');
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          '';

        if (!text) continue;

        db.prepare('INSERT INTO messages (phone_number, direction, message_text) VALUES (?, ?, ?)').run([phone, 'incoming', text]);

        const setting = db.prepare("SELECT value FROM settings WHERE key = 'owner_available'").get();
        if (setting?.value === 'false') {
          const products = db.prepare(
            'SELECT name, size, color, price FROM products WHERE stock_quantity > 0 ORDER BY name'
          ).all();
          const storeName = db.prepare("SELECT value FROM settings WHERE key = 'store_name'").get()?.value || 'Our Store';

          let reply = `Hello! 👋 Thank you for reaching out to *${storeName}*.\n\n`;
          reply += `The owner is currently away, but here's what we have *in stock* right now:\n\n`;

          if (products.length === 0) {
            reply += '_No items currently in stock_\n\n';
          } else {
            products.forEach((p, i) => {
              reply += `${i + 1}. *${p.name}*`;
              if (p.size) reply += ` — Size: ${p.size}`;
              if (p.color) reply += ` | Color: ${p.color}`;
              reply += ` | ₦${Number(p.price).toLocaleString()}\n`;
            });
            reply += '\n';
          }

          reply += `Please let us know what you'd like and your size. The owner will confirm your order when they return. 😊`;

          try {
            await sock.sendMessage(jid, { text: reply });
            db.prepare('INSERT INTO messages (phone_number, direction, message_text) VALUES (?, ?, ?)').run([phone, 'outgoing', reply]);
          } catch (err) {
            console.error('[WhatsApp] Send error:', err.message);
          }
        }
      }
    });
  } catch (err) {
    console.error('[WhatsApp] Failed to start:', err.message);
    connectionStatus = 'error';
  }
}

startWhatsApp();

router.get('/status', (req, res) => {
  res.json({ status: connectionStatus });
});

router.get('/qr', (req, res) => {
  res.json({ qr: qrCodeData, status: connectionStatus });
});

router.post('/connect', async (req, res) => {
  if (connectionStatus === 'disconnected' || connectionStatus === 'error') {
    startWhatsApp();
  }
  res.json({ status: connectionStatus });
});

router.post('/disconnect', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
      sock = null;
    }
    qrCodeData = null;
    connectionStatus = 'disconnected';
  } catch (e) {
    connectionStatus = 'disconnected';
  }
  res.json({ success: true });
});

module.exports = router;
