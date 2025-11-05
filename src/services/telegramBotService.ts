// src/services/telegramBotService.ts
export async function sendAttemptToTelegram(data: {
  storageKey?: string;
  name?: string;
  phone?: string;
  grade?: number;
  filial?: string; // friendly label
  categoryScores?: Record<string, number>;
}) {
  try {
    const base = (import.meta.env.VITE_API_BASE_URL as string) || '';
    const url = `${base}/api/sendToTelegram`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    const apiSecret = (import.meta.env.VITE_API_SECRET as string) || '';
    if (apiSecret) headers['x-api-key'] = apiSecret;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    const text = await res.text(); // defensive: sometimes server returns empty or non-json
    try {
      const json = text ? JSON.parse(text) : {};
      console.log('Telegram API result:', json);
      return json;
    } catch (err) {
      // fallback: log raw text for easier debugging
      console.warn('Failed to parse JSON from sendToTelegram response, raw text:', text);
      return { ok: false, error: 'Invalid JSON from server', raw: text };
    }
  } catch (err) {
    console.error('Failed to send to Telegram', err);
    throw err;
  }
}
