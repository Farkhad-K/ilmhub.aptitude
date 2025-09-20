// api/sendToTelegram.ts
export default async function handler(req: any, res: any) {
  // Allow only POST
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    // Optional API secret check (server-only env)
    const API_SECRET = process.env.API_SECRET;
    if (API_SECRET) {
      const key = (req.headers['x-api-key'] || '') as string;
      if (key !== API_SECRET) {
        return res.status(401).json({ ok: false, error: 'Invalid API key' });
      }
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (!BOT_TOKEN || !CHAT_ID) return res.status(500).json({ ok: false, error: 'Telegram not configured' });

    const body = req.body || {};
    const { name, phone, grade } = body;
    const rawCategoryScores = body.categoryScores;

    if (!rawCategoryScores || typeof rawCategoryScores !== 'object') {
      return res.status(400).json({ ok: false, error: 'categoryScores required' });
    }

    // Convert incoming scores to numeric map
    const categoryScores: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawCategoryScores)) {
      const n = typeof v === 'number' ? v : Number(String(v).replace('%', '').trim());
      categoryScores[k] = Number.isFinite(n) ? n : 0;
    }

    // Compute sum
    let sum = Object.values(categoryScores).reduce((s, v) => s + v, 0);

    // If sum !== 100 treat as counts and compute ceiled percentages
    if (sum !== 100) {
      const totalCount = sum;
      if (totalCount <= 0) {
        for (const k of Object.keys(categoryScores)) categoryScores[k] = 0;
      } else {
        // initial ceil percentages
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

    const textParts = [
      '📊 New Aptitude Test Attempt',
      name ? `👤 Name: ${name}` : null,
      phone ? `📱 Phone: +998${phone}` : null,
      typeof grade === 'number' ? `🎓 Grade: ${grade}` : null,
      '',
      `📝 Scores:\n${scoresText}`
    ].filter(Boolean);
    const text = textParts.join('\n');

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: CHAT_ID, text, parse_mode: 'HTML' };

    // send first request
    const firstResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const firstJson = await firstResp.json();

    // If Telegram responds with migration hint, retry with new chat id
    if (!firstJson.ok) {
      const migrateTo = firstJson?.parameters?.migrate_to_chat_id;
      if (migrateTo) {
        // retry using new id
        const retryPayload = { ...payload, chat_id: migrateTo };
        const retryResp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload)
        });
        const retryJson = await retryResp.json();
        if (retryJson.ok) {
          return res.status(200).json({
            ok: true,
            telegram: retryJson,
            computedPercentages: categoryScores,
            migratedTo: migrateTo
          });
        }
        console.error('Telegram API error after retry:', retryJson);
        return res.status(500).json({ ok: false, error: retryJson, computedPercentages: categoryScores });
      }

      console.error('Telegram API error (first attempt):', firstJson);
      return res.status(500).json({ ok: false, error: firstJson, computedPercentages: categoryScores });
    }

    // success
    return res.status(200).json({ ok: true, telegram: firstJson, computedPercentages: categoryScores });
  } catch (err: any) {
    console.error('sendToTelegram failed', err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}

// export default async function handler(req, res) {
//   // Allow only POST
//   if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

//   try {
//     // Basic optional API secret check (server-only env)
//     const API_SECRET = process.env.API_SECRET;
//     if (API_SECRET) {
//       const key = req.headers['x-api-key'] || '';
//       if (key !== API_SECRET) {
//         return res.status(401).json({ ok: false, error: 'Invalid API key' });
//       }
//     }

//     const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
//     const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
//     if (!BOT_TOKEN || !CHAT_ID) return res.status(500).json({ ok: false, error: 'Telegram not configured' });

//     const { name, phone, grade, categoryScores } = req.body || {};

//     const scoresText = categoryScores ? Object.entries(categoryScores).map(([k, v]) => `${k}: ${v}`).join('\n') : '-';
//     const textParts = [
//       '📊 New Aptitude Test Attempt',
//       name ? `👤 Name: ${name}` : null,
//       phone ? `📱 Phone: +998${phone}` : null,
//       typeof grade === 'number' ? `🎓 Grade: ${grade}` : null,
//       '',
//       `📝 Scores:\n${scoresText}`
//     ].filter(Boolean);
//     const text = textParts.join('\n');

//     const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ chat_id: CHAT_ID, text })
//     });

//     const json = await resp.json();
//     if (!json.ok) {
//       console.error('Telegram error', json);
//       return res.status(500).json({ ok: false, error: json });
//     }

//     return res.status(200).json({ ok: true, telegram: json });
//   } catch (err) {
//     console.error('sendToTelegram failed', err);
//     return res.status(500).json({ ok: false, error: err.message || String(err) });
//   }
// }
