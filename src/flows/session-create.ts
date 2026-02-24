import { BotContext } from '../bot/middleware.js';
import { createSession, updateUserState, updateUser } from '../db/queries.js';
import { safeEditMessage, escapeHtml } from '../bot/helpers.js';
import { waitingKeyboard } from '../ui/keyboards.js';
import { waitingCard } from '../ui/cards.js';
import { config } from '../config.js';
import { Session } from '../db/models/session.js';
import { t } from '../ui/i18n.js';

export async function handleStartChat(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  if (!ul) {
    await ctx.answerCallbackQuery({ text: t(ul, 'alert_set_lang'), show_alert: true });
    return;
  }

  // Create session
  const session = await createSession(
    user.telegramId,
    user.firstName,
    ul
  );

  const botUsername = config.telegram.botUsername;
  const inviteLink = `https://t.me/${botUsername}?start=JOIN_${session.inviteToken}`;

  // Edit the home card in place to show waiting state
  const text = waitingCard(user, session, inviteLink);

  if (user.profileCardMessageId) {
    await safeEditMessage(ctx, chatId, user.profileCardMessageId, text, {
      reply_markup: waitingKeyboard(ul),
    });
  }

  await updateUserState(user.telegramId, 'creating_session', {
    currentSessionId: session._id,
  });

  await ctx.answerCallbackQuery();
}

export async function handleCancelSession(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;

  // Cancel any pending sessions
  await Session.updateMany(
    { creatorId: user.telegramId, status: 'waiting' },
    { $set: { status: 'ended', endedAt: new Date() } }
  );

  await updateUserState(user.telegramId, 'menu', { currentSessionId: undefined });

  // Show home card via edit
  const { showHome } = await import('./returning.js');
  await showHome(ctx, 'edit');
  await ctx.answerCallbackQuery();
}
