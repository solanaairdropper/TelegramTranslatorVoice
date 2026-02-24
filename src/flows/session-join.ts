import { BotContext } from '../bot/middleware.js';
import {
  findSessionByToken,
  findSessionByCode,
  findWaitingSessions,
  activateSession,
  updateUserState,
  updateUser,
  getUser,
} from '../db/queries.js';
import {
  safeDeleteMessage,
  escapeHtml,
  cleanAll,
} from '../bot/helpers.js';
import { waitingSessionsKeyboard, confirmJoinKeyboard } from '../ui/keyboards.js';
import { chatStartedSeparator, nowConnectedMessage } from '../ui/separators.js';
import { getLanguage } from '../utils/language-codes.js';
import { t, timeAgo } from '../ui/i18n.js';

export async function handleJoinChat(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  if (!ul) {
    await ctx.answerCallbackQuery({ text: t(ul, 'alert_set_lang'), show_alert: true });
    return;
  }

  // Clean everything before showing join screen
  await cleanAll(ctx, user);

  // Get waiting sessions (exclude user's own)
  const sessions = await findWaitingSessions();
  const available = sessions.filter(s => s.creatorId !== user.telegramId);

  if (available.length === 0) {
    const msg = await ctx.reply(
      t(ul, 'msg_no_sessions'),
      {
        reply_markup: waitingSessionsKeyboard([], ul),
      }
    );
    await updateUser(user.telegramId, {
      pendingMessageIds: [msg.message_id],
      profileCardMessageId: undefined,
      menuMessageId: undefined,
    });
  } else {
    const sessionList = available.map(s => ({
      name: s.creatorName,
      code: s.joinCode,
      timeAgo: timeAgo(s.createdAt, ul),
      id: s._id.toString(),
    }));

    const msg = await ctx.reply(
      t(ul, 'msg_available_chats'),
      {
        parse_mode: 'HTML',
        reply_markup: waitingSessionsKeyboard(sessionList, ul),
      }
    );
    await updateUser(user.telegramId, {
      pendingMessageIds: [msg.message_id],
      profileCardMessageId: undefined,
      menuMessageId: undefined,
    });
  }

  await updateUserState(user.telegramId, 'joining_session');
  await ctx.answerCallbackQuery();
}

export async function handleJoinByDeepLink(ctx: BotContext, token: string): Promise<void> {
  const user = ctx.dbUser;
  const ul = user.language;

  // Clean old messages first
  await cleanAll(ctx, user);

  const session = await findSessionByToken(token);

  if (!session) {
    await ctx.reply(t(ul, 'msg_invite_expired'));
    return;
  }

  if (session.creatorId === user.telegramId) {
    await ctx.reply(t(ul, 'msg_own_session'));
    return;
  }

  // Show confirmation
  const creatorLang = getLanguage(session.creatorLanguage)?.name ?? session.creatorLanguage;
  const userLang = getLanguage(ul ?? '')?.name ?? ul ?? 'Not set';

  const confirmMsg = await ctx.reply(
    t(ul, 'msg_join_title', { name: escapeHtml(session.creatorName) }) + '\n\n' +
    t(ul, 'msg_their_lang', { lang: creatorLang }) + '\n' +
    t(ul, 'msg_your_lang', { lang: userLang }) + '\n\n' +
    t(ul, 'msg_you_type_in', { yourLang: userLang, theirLang: creatorLang }) + '\n' +
    t(ul, 'msg_they_type_in', { yourLang: userLang, theirLang: creatorLang }),
    {
      parse_mode: 'HTML',
      reply_markup: confirmJoinKeyboard(session._id.toString(), ul),
    }
  );

  await updateUserState(user.telegramId, 'joining_session', {
    pendingMessageIds: [confirmMsg.message_id],
    profileCardMessageId: undefined,
    menuMessageId: undefined,
  });
}

export async function handleJoinCodeEntry(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  // Delete the join list message
  for (const msgId of user.pendingMessageIds) {
    await safeDeleteMessage(ctx, chatId, msgId);
  }

  const codeMsg = await ctx.reply(
    t(ul, 'msg_enter_code'),
    { parse_mode: 'HTML' }
  );

  await updateUserState(user.telegramId, 'joining_enter_code', {
    pendingMessageIds: [codeMsg.message_id],
  });

  await ctx.answerCallbackQuery();
}

export async function handleCodeInput(ctx: BotContext, code: string): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  // Delete user's code message
  if (ctx.message) {
    await safeDeleteMessage(ctx, chatId, ctx.message.message_id);
  }

  // Delete the prompt
  for (const msgId of user.pendingMessageIds) {
    await safeDeleteMessage(ctx, chatId, msgId);
  }

  const session = await findSessionByCode(code.trim());

  if (!session) {
    const errMsg = await ctx.reply(t(ul, 'msg_invalid_code'));
    await updateUser(user.telegramId, { pendingMessageIds: [errMsg.message_id] });
    return;
  }

  if (session.creatorId === user.telegramId) {
    const errMsg = await ctx.reply(t(ul, 'msg_own_session'));
    await updateUser(user.telegramId, { pendingMessageIds: [errMsg.message_id] });
    return;
  }

  // Show confirmation
  const creatorLang = getLanguage(session.creatorLanguage)?.name ?? session.creatorLanguage;
  const userLang = getLanguage(ul ?? '')?.name ?? ul ?? 'Not set';

  const confirmMsg = await ctx.reply(
    t(ul, 'msg_join_title', { name: escapeHtml(session.creatorName) }) + '\n\n' +
    t(ul, 'msg_their_lang', { lang: creatorLang }) + '\n' +
    t(ul, 'msg_your_lang', { lang: userLang }) + '\n\n' +
    t(ul, 'msg_you_type_in', { yourLang: userLang, theirLang: creatorLang }) + '\n' +
    t(ul, 'msg_they_type_in', { yourLang: userLang, theirLang: creatorLang }),
    {
      parse_mode: 'HTML',
      reply_markup: confirmJoinKeyboard(session._id.toString(), ul),
    }
  );

  await updateUser(user.telegramId, { pendingMessageIds: [confirmMsg.message_id] });
}

export async function handleJoinConfirm(ctx: BotContext, sessionId: string): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  // Activate session
  const session = await activateSession(
    new (await import('mongoose')).Types.ObjectId(sessionId),
    user.telegramId,
    user.firstName,
    ul ?? 'en'
  );

  if (!session) {
    await ctx.answerCallbackQuery({ text: t(ul, 'alert_session_unavailable'), show_alert: true });
    return;
  }

  // Clean ALL joiner messages (clean slate for chat)
  await cleanAll(ctx, user);
  if (ctx.callbackQuery?.message) {
    await safeDeleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id);
  }

  // Send chat started separator to joiner (in their language)
  await ctx.reply(chatStartedSeparator(ul), { parse_mode: 'HTML' });
  await ctx.reply(nowConnectedMessage(session.creatorName, ul), { parse_mode: 'HTML' });

  // Update joiner state
  await updateUserState(user.telegramId, 'in_chat', {
    currentSessionId: session._id,
    pendingMessageIds: [],
    profileCardMessageId: undefined,
    menuMessageId: undefined,
  });

  // ── Notify the creator ──
  const creator = await getUser(session.creatorId);
  if (creator) {
    const creatorChatId = session.creatorId;
    const cl = creator.language;

    // Clean ALL creator messages (waiting card, pending, etc.)
    await cleanAll(ctx, creator);

    // Send started separator to creator (in THEIR language)
    await ctx.api.sendMessage(creatorChatId, chatStartedSeparator(cl), { parse_mode: 'HTML' });
    await ctx.api.sendMessage(creatorChatId, nowConnectedMessage(user.firstName, cl), { parse_mode: 'HTML' });

    // Update creator state
    await updateUserState(creator.telegramId, 'in_chat', {
      currentSessionId: session._id,
      pendingMessageIds: [],
      profileCardMessageId: undefined,
      menuMessageId: undefined,
    });
  }

  await ctx.answerCallbackQuery({ text: t(ul, 'alert_connected') });
}

export async function handleSelectSession(ctx: BotContext, sessionId: string): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  const { Session } = await import('../db/models/session.js');
  const session = await Session.findById(sessionId);

  if (!session || session.status !== 'waiting') {
    await ctx.answerCallbackQuery({ text: t(ul, 'alert_session_unavailable'), show_alert: true });
    return;
  }

  // Show confirmation
  const creatorLang = getLanguage(session.creatorLanguage)?.name ?? session.creatorLanguage;
  const userLang = getLanguage(ul ?? '')?.name ?? ul ?? 'Not set';

  // Delete the session list
  for (const msgId of user.pendingMessageIds) {
    await safeDeleteMessage(ctx, chatId, msgId);
  }
  if (ctx.callbackQuery?.message) {
    await safeDeleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id);
  }

  const confirmMsg = await ctx.reply(
    t(ul, 'msg_join_title', { name: escapeHtml(session.creatorName) }) + '\n\n' +
    t(ul, 'msg_their_lang', { lang: creatorLang }) + '\n' +
    t(ul, 'msg_your_lang', { lang: userLang }) + '\n\n' +
    t(ul, 'msg_you_type_in', { yourLang: userLang, theirLang: creatorLang }) + '\n' +
    t(ul, 'msg_they_type_in', { yourLang: userLang, theirLang: creatorLang }),
    {
      parse_mode: 'HTML',
      reply_markup: confirmJoinKeyboard(session._id.toString(), ul),
    }
  );

  await updateUser(user.telegramId, { pendingMessageIds: [confirmMsg.message_id] });
  await ctx.answerCallbackQuery();
}
