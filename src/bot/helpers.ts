import { Context } from 'grammy';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function safeDeleteMessage(ctx: Context, chatId: number, messageId: number): Promise<boolean> {
  try {
    await ctx.api.deleteMessage(chatId, messageId);
    return true;
  } catch {
    return false;
  }
}

export async function safeDeleteMessages(ctx: Context, chatId: number, messageIds: number[]): Promise<boolean> {
  if (messageIds.length === 0) return true;
  try {
    // Telegram allows max 100 per batch
    for (let i = 0; i < messageIds.length; i += 100) {
      const batch = messageIds.slice(i, i + 100);
      if (batch.length === 1) {
        await ctx.api.deleteMessage(chatId, batch[0]);
      } else {
        await ctx.api.deleteMessages(chatId, batch);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function safeEditMessage(
  ctx: Context,
  chatId: number,
  messageId: number,
  text: string,
  options?: { reply_markup?: any; parse_mode?: any }
): Promise<boolean> {
  try {
    await ctx.api.editMessageText(chatId, messageId, text, {
      parse_mode: 'HTML' as const,
      ...options,
    });
    return true;
  } catch {
    return false;
  }
}

// Universal cleanup: delete ALL tracked messages for a user (pending, profile card, menu)
export async function cleanAll(
  ctx: Context,
  user: { telegramId: number; pendingMessageIds: number[]; profileCardMessageId?: number; menuMessageId?: number }
): Promise<void> {
  const chatId = user.telegramId; // In DMs, chatId === telegramId
  const toDelete: number[] = [...user.pendingMessageIds];
  if (user.profileCardMessageId) toDelete.push(user.profileCardMessageId);
  if (user.menuMessageId) toDelete.push(user.menuMessageId);
  if (toDelete.length > 0) {
    await safeDeleteMessages(ctx, chatId, toDelete);
  }
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
