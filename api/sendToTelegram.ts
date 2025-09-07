// api/sendToTelegram.js
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    // Basic optional API secret check (server-only env)
    const API_SECRET = process.env.API_SECRET;
    if (API_SECRET) {
      const key = req.headers['x-api-key'] || '';
      if (key !== API_SECRET) {
        return res.status(401).json({ ok: false, error: 'Invalid API key' });
      }
    }

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    if (!BOT_TOKEN || !CHAT_ID) return res.status(500).json({ ok: false, error: 'Telegram not configured' });

    const { name, phone, grade, categoryScores } = req.body || {};

    const scoresText = categoryScores ? Object.entries(categoryScores).map(([k, v]) => `${k}: ${v}`).join('\n') : '-';
    const textParts = [
      '📊 New Aptitude Test Attempt',
      name ? `👤 Name: ${name}` : null,
      phone ? `📱 Phone: +998${phone}` : null,
      typeof grade === 'number' ? `🎓 Grade: ${grade}` : null,
      '',
      `📝 Scores:\n${scoresText}`
    ].filter(Boolean);
    const text = textParts.join('\n');

    const resp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text })
    });

    const json = await resp.json();
    if (!json.ok) {
      console.error('Telegram error', json);
      return res.status(500).json({ ok: false, error: json });
    }

    return res.status(200).json({ ok: true, telegram: json });
  } catch (err) {
    console.error('sendToTelegram failed', err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}
