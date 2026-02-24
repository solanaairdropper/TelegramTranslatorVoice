// Simple per-chat rate limiter to avoid Telegram flood limits
const lastSent = new Map<number, number>();

const MIN_INTERVAL_MS = 1050; // ~1 message per second per chat

export async function rateLimitChat(chatId: number): Promise<void> {
  const last = lastSent.get(chatId) ?? 0;
  const now = Date.now();
  const diff = now - last;

  if (diff < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - diff));
  }

  lastSent.set(chatId, Date.now());
}
