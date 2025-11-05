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

// canonical categories and synonyms map
const CANONICAL_ORDER = ['art', 'nature', 'technology'];
const SYNONYMS = {
  technology: new Set(['technology', 'tech', 'it', 'engineering', 'techology']),
  art: new Set(['art', 'arts', 'creative', 'artsandcrafts']),
  nature: new Set(['nature', 'science', 'biolog', 'environment', 'biology'])
};

function normalizeCategoryKey(raw) {
  if (!raw) return '';
  const key = String(raw).toLowerCase().trim();
  for (const [canon, set] of Object.entries(SYNONYMS)) {
    if (set.has(key)) return canon;
  }
  // fallback: keep only letters/numbers and return lowercased
  return key.replace(/[^a-z0-9-_]/g, '');
}

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
    let CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok: false, error: 'Telegram bot token or chat id not configured' });
    }

    const body = req.body || {};
    const { name, phone, grade, categoryScores: rawCategoryScores, storageKey, filial } = body;

    if (!rawCategoryScores || typeof rawCategoryScores !== 'object') {
      return res.status(400).json({ ok: false, error: 'categoryScores required' });
    }

    // Build numeric counts map with normalized keys
    const counts = {};
    for (const [k, v] of Object.entries(rawCategoryScores)) {
      const rawVal = typeof v === 'number' ? v : Number(String(v).replace('%', '').trim());
      const num = Number.isFinite(rawVal) ? rawVal : 0;
      const canon = normalizeCategoryKey(k) || 'unknown';
      counts[canon] = (counts[canon] || 0) + num;
    }

    // Ensure canonical categories exist (so output order is stable)
    for (const c of CANONICAL_ORDER) {
      if (!Object.prototype.hasOwnProperty.call(counts, c)) counts[c] = 0;
    }

    // If there are any other unexpected categories, keep them too but they won't break output.
    // Now compute percentages: if sum != 100 we treat incoming as counts and convert to percentages.
    let sum = Object.values(counts).reduce((s, v) => s + v, 0);

    const categoryScores = {}; // final integer percentages

    if (sum <= 0) {
      // nothing answered; zero everything
      for (const k of Object.keys(counts)) categoryScores[k] = 0;
    } else {
      // initial ceil percentages from counts
      for (const k of Object.keys(counts)) {
        const count = counts[k];
        categoryScores[k] = Math.ceil((count / sum) * 100);
      }

      // ensure total exactly 100 (adjust by decreasing from largest, or increasing if needed)
      let pctSum = Object.values(categoryScores).reduce((s, v) => s + v, 0);
      if (pctSum > 100) {
        let excess = pctSum - 100;
        // keys sorted by descending percentage, prefer to reduce larger buckets
        const keysByDesc = Object.keys(categoryScores).sort((a, b) => categoryScores[b] - categoryScores[a]);
        let idx = 0;
        while (excess > 0 && keysByDesc.length > 0) {
          const key = keysByDesc[idx % keysByDesc.length];
          if (categoryScores[key] > 0) {
            categoryScores[key] = Math.max(0, categoryScores[key] - 1);
            excess--;
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
          deficit--;
          idx++;
        }
      }
    }

    // Build ordered scores string in canonical order (art, nature, technology)
    const orderedKeys = [...CANONICAL_ORDER, ...Object.keys(categoryScores).filter(k => !CANONICAL_ORDER.includes(k))];
    // Make sure each key appears only once
    const seen = new Set();
    const orderedUnique = orderedKeys.filter(k => {
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const scoresText = orderedUnique.map(k => `${k}: ${categoryScores[k] ?? 0}%`).join('\n');

    // Build message parts (include filial if present)
    const textParts = [
      '📊 New Aptitude Test Attempt',
      name ? `👤 Name: ${name}` : null,
      phone ? `📱 Phone: +998${phone}` : null,
      grade !== undefined ? `🎓 Grade: ${grade}` : null,
      filial ? `🏢 Branch: ${filial}\n` : null,
      '',
      `📝 Scores:\n${scoresText}`
    ].filter(Boolean);
    const text = textParts.join('\n');

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: CHAT_ID, text, parse_mode: 'HTML' };

    // first attempt (defensive parsing)
    const firstResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const firstText = await firstResp.text();
    let firstJson;
    try {
      firstJson = firstText ? JSON.parse(firstText) : {};
    } catch (parseErr) {
      console.warn('Failed to parse Telegram response as JSON (first attempt):', firstText);
      firstJson = { ok: false, raw: firstText };
    }

    // If Telegram responds with migration hint (migrate_to_chat_id), retry with new id
    const migrateTo = (firstJson && (firstJson.parameters?.migrate_to_chat_id || firstJson.migrate_to_chat_id))
      || (firstJson?.result?.migrate_to_chat_id);

    if (!firstJson?.ok && migrateTo) {
      console.warn('Telegram chat migrated, retrying with new chat id:', migrateTo);
      // retry once using migrateTo
      const retryPayload = { ...payload, chat_id: migrateTo };
      const retryResp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retryPayload)
      });

      const retryText = await retryResp.text();
      let retryJson;
      try {
        retryJson = retryText ? JSON.parse(retryText) : {};
      } catch (e) {
        console.error('Failed to parse Telegram retry response:', retryText);
        return res.status(500).json({
          ok: false,
          error: 'Telegram retry returned invalid JSON',
          raw: retryText
        });
      }

      if (retryJson?.ok) {
        // optionally store/update CHAT_ID in your environment/db if you want persisted new id
        return res.json({
          ok: true,
          telegram: retryJson,
          computedPercentages: categoryScores,
          migratedTo: migrateTo
        });
      } else {
        console.error('Telegram API error after retry:', retryJson);
        return res.status(500).json({ ok: false, error: retryJson });
      }
    }

    if (!firstJson?.ok) {
      console.error('Telegram API error:', firstJson);
      // return parsed JSON or raw text for easier debugging
      return res.status(500).json({ ok: false, error: firstJson });
    }

    // success
    return res.json({
      ok: true,
      telegram: firstJson,
      computedPercentages: categoryScores
    });
  } catch (err) {
    console.error('sendToTelegram error', err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`telegram-forwarder running on http://localhost:${PORT}`);
});
