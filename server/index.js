// server/index.js (ESM)
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import express from 'express';

const app = express();
const PORT = process.env.PORT || 5174;

app.use((req, res, next) => {
  const origin = req.get('Origin') || req.get('origin') || '';
  const allowed = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.VITE_API_BASE_URL
  ].filter(Boolean);

  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Dev fallback; in production you should restrict this to your real frontends
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

    const body = req.body || {};
    const { name, phone, grade, categoryScores: rawCategoryScores, storageKey } = body;

    if (!rawCategoryScores || typeof rawCategoryScores !== 'object') {
      return res.status(400).json({ ok: false, error: 'categoryScores required' });
    }

    // Copy incoming values into numeric map
    const categoryScores = {};
    for (const [k, v] of Object.entries(rawCategoryScores)) {
      const n = typeof v === 'number' ? v : Number(String(v).replace('%', '').trim());
      categoryScores[k] = Number.isFinite(n) ? n : 0;
    }

    // Sum
    let sum = Object.values(categoryScores).reduce((s, v) => s + v, 0);

    // If sum !== 100 treat values as counts -> compute ceiled percentages
    if (sum !== 100) {
      const totalCount = sum;
      if (totalCount <= 0) {
        for (const k of Object.keys(categoryScores)) categoryScores[k] = 0;
      } else {
        // initial ceil
        for (const k of Object.keys(categoryScores)) {
          const count = categoryScores[k];
          categoryScores[k] = Math.ceil((count / totalCount) * 100);
        }

        // adjust to make total exactly 100 (reduce from largest)
        let pctSum = Object.values(categoryScores).reduce((s, v) => s + v, 0);
        if (pctSum > 100) {
          let excess = pctSum - 100;
          const keysByDesc = Object.keys(categoryScores).sort((a, b) => categoryScores[b] - categoryScores[a]);
          let idx = 0;
          while (excess > 0 && keysByDesc.length > 0) {
            const key = keysByDesc[idx % keysByDesc.length];
            if (categoryScores[key] > 0) {
              categoryScores[key] = Math.max(0, categoryScores[key] - 1);
              excess -= 1;
            }
            idx++;
          }
        } else if (pctSum < 100) {
          let deficit = 100 - pctSum;
          const keysByDesc = Object.keys(categoryScores).sort((a, b) => categoryScores[b] - categoryScores[a]);
          let idx = 0;
          while (deficit > 0 && keysByDesc.length > 0) {
            const key = keysByDesc[idx % keysByDesc.length];
            categoryScores[key] = categoryScores[key] + 1;
            deficit -= 1;
            idx++;
          }
        }
      }
    } else {
      // sum === 100: ensure integers (ceil) and adjust if ceil changed totals
      for (const k of Object.keys(categoryScores)) {
        categoryScores[k] = Math.ceil(categoryScores[k]);
      }
      let pctSum = Object.values(categoryScores).reduce((s, v) => s + v, 0);
      if (pctSum !== 100) {
        if (pctSum > 100) {
          let excess = pctSum - 100;
          const keysByDesc = Object.keys(categoryScores).sort((a, b) => categoryScores[b] - categoryScores[a]);
          let idx = 0;
          while (excess > 0 && keysByDesc.length > 0) {
            const key = keysByDesc[idx % keysByDesc.length];
            if (categoryScores[key] > 0) {
              categoryScores[key] = Math.max(0, categoryScores[key] - 1);
              excess -= 1;
            }
            idx++;
          }
        } else {
          let deficit = 100 - pctSum;
          const keysByDesc = Object.keys(categoryScores).sort((a, b) => categoryScores[b] - categoryScores[a]);
          let idx = 0;
          while (deficit > 0 && keysByDesc.length > 0) {
            const key = keysByDesc[idx % keysByDesc.length];
            categoryScores[key] = categoryScores[key] + 1;
            deficit -= 1;
            idx++;
          }
        }
      }
    }

    // Build sorted scores text with percent sign
    const sortedEntries = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
    const scoresText = sortedEntries.map(([k, v]) => `${k}: ${v}%`).join('\n');

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
    const payload = { chat_id: CHAT_ID, text, parse_mode: 'HTML' };

    // First attempt
    const firstResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const firstJson = await firstResp.json();

    // If Telegram responds with migration hint, retry with new id
    if (!firstJson.ok) {
      const migrateTo = firstJson.parameters && firstJson.parameters.migrate_to_chat_id;
      if (migrateTo) {
        console.warn('Telegram chat migrated, retrying with new chat id:', migrateTo);
        const retryPayload = { ...payload, chat_id: migrateTo };
        const retryResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload)
        });
        const retryJson = await retryResp.json();
        if (retryJson.ok) {
          return res.json({
            ok: true,
            telegram: retryJson,
            computedPercentages: categoryScores,
            migratedTo: migrateTo
          });
        }
        console.error('Telegram API error after retry:', retryJson);
        return res.status(500).json({ ok: false, error: retryJson });
      }

      console.error('Telegram API error:', firstJson);
      return res.status(500).json({ ok: false, error: firstJson });
    }

    // success
    return res.json({ ok: true, telegram: firstJson, computedPercentages: categoryScores });
  } catch (err) {
    console.error('sendToTelegram error', err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`telegram-forwarder running on http://localhost:${PORT}`);
});
