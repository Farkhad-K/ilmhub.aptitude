// server/index.js (ESM)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';

const app = express();
const PORT = process.env.PORT || 5174;

app.use((req, res, next) => {
  // read request origin
  const origin = req.get('Origin') || req.get('origin') || '';

  // small allow-list for local dev — add any other allowed origins here
  const allowed = [
    'http://localhost:5173', // Vite dev server
    'http://localhost:5174', // your API (if you ever call it directly)
    process.env.VITE_API_BASE_URL // optional from env
  ].filter(Boolean);

  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // dev fallback: allow '*' (or better: disallow)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

app.post('/api/sendToTelegram', async (req, res) => {
  try {
    const API_SECRET = process.env.API_SECRET;
    if (API_SECRET) {
      const key = req.get('x-api-key') || '';
      if (key !== API_SECRET) {
        return res.status(401).json({ ok: false, error: 'Invalid API key' });
      }
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok: false, error: 'Telegram bot token or chat id not configured' });
    }

    const { name, phone, grade, categoryScores, storageKey } = req.body || {};

    const scoresText = categoryScores
      ? Object.entries(categoryScores).map(([k, v]) => `${k}: ${v}`).join('\n')
      : '-';

    const text = [
      '📊 New Aptitude Test Attempt',
      name ? `👤 Name: ${name}` : null,
      phone ? `📱 Phone: +998${phone}` : null,
      grade !== undefined ? `🎓 Grade: ${grade}` : null,
      storageKey ? `🔑 Key: ${storageKey}` : null,
      '',
      `📝 Scores:\n${scoresText}`
    ].filter(Boolean).join('\n');

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const tgResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });

    const json = await tgResp.json();
    if (!json.ok) {
      console.error('Telegram API error:', json);
      return res.status(500).json({ ok: false, error: json });
    }

    return res.json({ ok: true, telegram: json });
  } catch (err) {
    console.error('sendToTelegram error', err);
    return res.status(500).json({ ok: false, error: err.message || err });
  }
});

app.listen(PORT, () => {
  console.log(`telegram-forwarder running on http://localhost:${PORT}`);
});
