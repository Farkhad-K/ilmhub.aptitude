export async function sendAttemptToTelegram(data: {
  name?: string;
  phone?: string;
  grade?: number;
  categoryScores?: Record<string, number>;
}) {
  try {
    const res = await fetch("/api/sendToTelegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    console.log("Telegram API result:", result);
    return result;
  } catch (err) {
    console.error("Failed to send to Telegram", err);
  }
}
