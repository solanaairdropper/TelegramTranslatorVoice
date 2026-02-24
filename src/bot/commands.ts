import { BotContext } from './middleware.js';
import { startOnboarding } from '../flows/onboarding.js';
import { handleReturningUser, showHome } from '../flows/returning.js';
import { handleJoinByDeepLink } from '../flows/session-join.js';
import { handleEndChat } from '../flows/chat.js';
import { settingsKeyboard } from '../ui/keyboards.js';
import { safeEditMessage, cleanAll } from './helpers.js';
import { updateUser } from '../db/queries.js';
import { t } from '../ui/i18n.js';

export async function handleStart(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text ?? '';
  const payload = text.split(' ')[1]; // /start PAYLOAD

  // Deep link: join via invite
  if (payload?.startsWith('JOIN_')) {
    const token = payload.slice(5);
    if (ctx.dbUser.state === 'new' || !ctx.dbUser.language) {
      await startOnboarding(ctx);
      return;
    }
    await handleJoinByDeepLink(ctx, token);
    return;
  }

  // New user
  if (ctx.dbUser.state === 'new' || !ctx.dbUser.language) {
    await startOnboarding(ctx);
    return;
  }

  // Returning user
  await handleReturningUser(ctx);
}

export async function handleEnd(ctx: BotContext): Promise<void> {
  const ul = ctx.dbUser.language;
  if (ctx.dbUser.state !== 'in_chat') {
    await ctx.reply(t(ul, 'alert_not_in_chat'));
    return;
  }
  await handleEndChat(ctx);
}

export async function handleMenu(ctx: BotContext): Promise<void> {
  if (!ctx.dbUser.language) {
    await startOnboarding(ctx);
    return;
  }
  await showHome(ctx, 'send');
}

export async function handleSettings(ctx: BotContext): Promise<void> {
  if (!ctx.dbUser.language) {
    await startOnboarding(ctx);
    return;
  }

  const user = ctx.dbUser;
  const ul = user.language;

  if (user.profileCardMessageId) {
    await safeEditMessage(
      ctx, ctx.chat!.id, user.profileCardMessageId,
      t(ul, 'msg_settings'),
      { reply_markup: settingsKeyboard(ul) }
    );
  } else {
    // No existing card — clean and send fresh, tracked message
    await cleanAll(ctx, user);
    const msg = await ctx.reply(t(ul, 'msg_settings'), {
      parse_mode: 'HTML',
      reply_markup: settingsKeyboard(ul),
    });
    await updateUser(user.telegramId, {
      profileCardMessageId: msg.message_id,
      pendingMessageIds: [],
      menuMessageId: undefined,
    });
  }
}
