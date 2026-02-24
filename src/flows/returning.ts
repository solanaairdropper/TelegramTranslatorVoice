import { BotContext } from '../bot/middleware.js';
import { updateUser, updateUserState, findActiveSessionForUser } from '../db/queries.js';
import { homeCard } from '../ui/cards.js';
import { homeKeyboard, confirmLanguageKeyboard } from '../ui/keyboards.js';
import { safeEditMessage, safeDeleteMessage, cleanAll } from '../bot/helpers.js';
import { getLanguage } from '../utils/language-codes.js';
import { Session } from '../db/models/session.js';
import { t, ensureLanguageStrings } from '../ui/i18n.js';

export async function handleReturningUser(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const ul = user.language;

  // Clean any old messages first
  await cleanAll(ctx, user);

  // Ensure translations are cached for this user's language
  if (ul) {
    const langName = getLanguage(ul)?.name ?? 'English';
    await ensureLanguageStrings(ul, langName);
  }

  const lang = getLanguage(ul ?? '')?.name ?? ul ?? 'your language';

  let welcomeText = t(ul, 'msg_welcome_back', { name: user.firstName });

  if (user.pastPartners.length > 0) {
    const lastPartner = user.pastPartners[user.pastPartners.length - 1];
    welcomeText += '\n' + t(ul, 'msg_last_partner', { name: lastPartner.firstName });
  }

  welcomeText += '\n\n' + t(ul, 'msg_still_using', { lang });

  const confirmMsg = await ctx.reply(welcomeText, {
    parse_mode: 'HTML',
    reply_markup: confirmLanguageKeyboard(ul),
  });

  await updateUserState(user.telegramId, 'onboarding_confirm', {
    pendingMessageIds: [confirmMsg.message_id],
    profileCardMessageId: undefined,
    menuMessageId: undefined,
  });
}

// ── Central "show home" function — always ONE message with profile + status + buttons ──

export async function showHome(ctx: BotContext, method: 'send' | 'edit' = 'send'): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  // Fetch current session state
  const pendingSessions = await Session.find({ creatorId: user.telegramId, status: 'waiting' }).limit(5);
  const activeSession = await findActiveSessionForUser(user.telegramId);
  const activeSessions = activeSession ? [activeSession] : [];

  const text = homeCard(user, { pendingSessions, activeSessions });
  const keyboard = homeKeyboard(ul, {
    hasPendingSession: pendingSessions.length > 0,
    hasActiveSession: activeSessions.length > 0,
  });

  // Always clean pending messages regardless of edit/send
  for (const msgId of user.pendingMessageIds) {
    await safeDeleteMessage(ctx, chatId, msgId);
  }

  if (method === 'edit' && user.profileCardMessageId) {
    const ok = await safeEditMessage(ctx, chatId, user.profileCardMessageId, text, {
      reply_markup: keyboard,
    });
    if (ok) {
      await updateUserState(user.telegramId, 'menu', {
        pendingMessageIds: [],
        menuMessageId: undefined,
      });
      return;
    }
    // Edit failed (message too old or deleted), fall through to send
  }

  // Clean up old menu/card messages
  if (user.profileCardMessageId) {
    await safeDeleteMessage(ctx, chatId, user.profileCardMessageId);
  }
  if (user.menuMessageId) {
    await safeDeleteMessage(ctx, chatId, user.menuMessageId);
  }

  const msg = await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  await updateUserState(user.telegramId, 'menu', {
    profileCardMessageId: msg.message_id,
    menuMessageId: undefined,
    pendingMessageIds: [],
  });
}

// Overload for when we have the API but not a ctx reply (e.g. notifying partner)
export async function showHomeForUser(ctx: BotContext, telegramId: number): Promise<void> {
  const { getUser } = await import('../db/queries.js');
  const user = await getUser(telegramId);
  if (!user) return;

  const ul = user.language;

  // Clean old messages for this user first
  await cleanAll(ctx, user);

  const pendingSessions = await Session.find({ creatorId: telegramId, status: 'waiting' }).limit(5);
  const activeSession = await findActiveSessionForUser(telegramId);
  const activeSessions = activeSession ? [activeSession] : [];

  const text = homeCard(user, { pendingSessions, activeSessions });
  const keyboard = homeKeyboard(ul, {
    hasPendingSession: pendingSessions.length > 0,
    hasActiveSession: activeSessions.length > 0,
  });

  const msg = await ctx.api.sendMessage(telegramId, text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  await updateUserState(telegramId, 'menu', {
    profileCardMessageId: msg.message_id,
    menuMessageId: undefined,
    pendingMessageIds: [],
  });
}
