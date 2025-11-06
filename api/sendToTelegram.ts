// api/sendToTelegram.ts
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Optional API secret check
    const API_SECRET = process.env.API_SECRET;
    if (API_SECRET) {
      const key = (req.headers['x-api-key'] || '') as string;
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
    const { name, phone, grade, filial, categoryScores: rawCategoryScores, storageKey } = body;

    if (!rawCategoryScores || typeof rawCategoryScores !== 'object') {
      return res.status(400).json({ ok: false, error: 'categoryScores required' });
    }

    // --- Normalization helpers ---
    const CANONICAL_ORDER = ['art', 'nature', 'technology'];
    const SYNONYMS: Record<string, Set<string>> = {
      technology: new Set(['technology', 'tech', 'it', 'engineering', 'techology']),
      art: new Set(['art', 'arts', 'creative', 'artsandcrafts']),
      nature: new Set(['nature', 'science', 'biolog', 'environment', 'biology'])
    };

    function normalizeCategoryKey(raw: string): string {
      if (!raw) return '';
      const key = String(raw).toLowerCase().trim();
      for (const [canon, set] of Object.entries(SYNONYMS)) {
        if (set.has(key)) return canon;
      }
      // fallback: strip non-alnum and return
      return key.replace(/[^a-z0-9-_]/g, '');
    }

    // Build numeric counts map with normalized keys
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawCategoryScores)) {
      const rawVal = typeof v === 'number' ? v : Number(String(v).replace('%', '').trim());
      const num = Number.isFinite(rawVal) ? rawVal : 0;
      const canon = normalizeCategoryKey(k) || 'unknown';
      counts[canon] = (counts[canon] || 0) + num;
    }

    // Ensure canonical categories exist for stable ordering
    for (const c of CANONICAL_ORDER) {
      if (!Object.prototype.hasOwnProperty.call(counts, c)) counts[c] = 0;
    }

    // Compute final integer percentages (sum exactly 100)
    const categoryScores: Record<string, number> = {};
    let sum = Object.values(counts).reduce((s, v) => s + v, 0);

    if (sum <= 0) {
      for (const k of Object.keys(counts)) categoryScores[k] = 0;
    } else {
      // initial ceil
      for (const k of Object.keys(counts)) {
        const count = counts[k];
        categoryScores[k] = Math.ceil((count / sum) * 100);
      }

      // adjust to exactly 100 by reducing from largest if needed,
      // or increasing if deficit (rounding artifact)
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

    // Build ordered score list in canonical order: art, nature, technology, then others
    const orderedKeys = [
      ...CANONICAL_ORDER,
      ...Object.keys(categoryScores).filter(k => !CANONICAL_ORDER.includes(k))
    ].filter((v, idx, arr) => arr.indexOf(v) === idx); // unique

    const scoresText = orderedKeys.map(k => `${k}: ${categoryScores[k] ?? 0}%`).join('\n');

    // Build message parts (include filial, storageKey)
    const textParts = [
      '📊 New Aptitude Test Result',
      name ? `👤 Name: ${name}` : null,
      phone ? `📱 Phone: +998${phone}` : null,
      grade !== undefined ? `🎓 Grade: ${grade}` : null,
      filial ? `🏢 Branch: <b><i>${filial}</i></b>\n` : null,
      '',
      `📝 Scores:\n${scoresText}`
    ].filter(Boolean);

    const text = textParts.join('\n');

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = { chat_id: CHAT_ID, text, parse_mode: 'HTML' };

    // Defensive send: parse text response in case Telegram returns non-json / empty
    const sendRequest = async (chatId: string) => {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, chat_id: chatId })
      });
      const textResp = await resp.text();
      try {
        return textResp ? JSON.parse(textResp) : {};
      } catch (parseErr) {
        // return a helpful wrapper if JSON parse failed
        return { ok: false, parseError: String(parseErr), raw: textResp };
      }
    };

    const firstJson = await sendRequest(CHAT_ID);

    // If Telegram indicates migration (chat -> supergroup) attempt retry with new id
    const migrateTo =
      (firstJson && (firstJson.parameters?.migrate_to_chat_id || (firstJson as any).migrate_to_chat_id))
      || (firstJson?.result?.migrate_to_chat_id);

    if (!firstJson?.ok && migrateTo) {
      // try again with migrated id
      const retryJson = await sendRequest(String(migrateTo));
      if (retryJson?.ok) {
        // Optionally: you could persist migrateTo (e.g. update env or DB) if you want
        return res.status(200).json({
          ok: true,
          telegram: retryJson,
          computedPercentages: categoryScores,
          migratedTo: migrateTo
        });
      } else {
        return res.status(500).json({ ok: false, error: retryJson, computedPercentages: categoryScores });
      }
    }

    if (!firstJson?.ok) {
      return res.status(500).json({ ok: false, error: firstJson, computedPercentages: categoryScores });
    }

    // success
    return res.status(200).json({ ok: true, telegram: firstJson, computedPercentages: categoryScores });
  } catch (err: any) {
    console.error('sendToTelegram failed', err);
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
}
