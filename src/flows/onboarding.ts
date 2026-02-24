import { BotContext } from '../bot/middleware.js';
import { updateUserState, updateUser } from '../db/queries.js';
import { profileCardSetup } from '../ui/cards.js';
import { languageKeyboard, dialectKeyboard, confirmLanguageKeyboard } from '../ui/keyboards.js';
import { safeDeleteMessage, safeEditMessage } from '../bot/helpers.js';
import { getLanguage } from '../utils/language-codes.js';
import { showHome } from './returning.js';
import { cleanAll } from '../bot/helpers.js';
import { t, ensureLanguageStrings } from '../ui/i18n.js';

export async function startOnboarding(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;

  // Clean any existing messages first
  await cleanAll(ctx, user);

  // Send profile card
  const cardMsg = await ctx.reply(profileCardSetup(user), { parse_mode: 'HTML' });

  // Send greeting + language picker combined (English — we don't know their language yet)
  const name = user.firstName || 'there';
  const langMsg = await ctx.reply(
    t(undefined, 'msg_greeting', { name }),
    { reply_markup: languageKeyboard(0) }
  );

  await updateUser(user.telegramId, {
    profileCardMessageId: cardMsg.message_id,
    pendingMessageIds: [langMsg.message_id],
    state: 'onboarding_lang',
  });
}

export async function handleLanguagePick(ctx: BotContext, langCode: string): Promise<void> {
  const user = ctx.dbUser;

  // Handle pagination
  if (langCode.startsWith('pg')) {
    const page = parseInt(langCode.slice(2), 10);
    await ctx.editMessageReplyMarkup({ reply_markup: languageKeyboard(page) });
    return;
  }

  if (langCode === 'noop') {
    await ctx.answerCallbackQuery();
    return;
  }

  const lang = getLanguage(langCode);
  if (!lang) {
    await ctx.answerCallbackQuery({ text: t(user.language, 'alert_unknown_lang'), show_alert: true });
    return;
  }

  const chatId = ctx.chat!.id;

  // Delete pending messages
  for (const msgId of user.pendingMessageIds) {
    await safeDeleteMessage(ctx, chatId, msgId);
  }
  if (ctx.callbackQuery?.message) {
    await safeDeleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id);
  }

  const updatedUser = (await updateUser(user.telegramId, { language: langCode, pendingMessageIds: [] }))!;

  // Translate all UI strings for this language (awaited so next screens are in their language)
  await ensureLanguageStrings(langCode, lang.name);

  // Update profile card
  if (user.profileCardMessageId) {
    await safeEditMessage(ctx, chatId, user.profileCardMessageId, profileCardSetup(updatedUser));
  }

  // Check if this language has dialects
  if (lang.dialects && lang.dialects.length > 0) {
    await updateUserState(user.telegramId, 'onboarding_dialect');
    const dialectMsg = await ctx.reply(t(langCode, 'msg_dialect_pick', { lang: lang.name }), {
      reply_markup: dialectKeyboard(lang.dialects, langCode),
    });
    await updateUser(user.telegramId, { pendingMessageIds: [dialectMsg.message_id] });
  } else {
    await showLanguageConfirmation(ctx, updatedUser);
  }

  await ctx.answerCallbackQuery();
}

export async function handleDialectPick(ctx: BotContext, dialect: string): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;

  const dialectVal = dialect === 'none' ? undefined : dialect;
  await updateUser(user.telegramId, { dialect: dialectVal });

  for (const msgId of user.pendingMessageIds) {
    await safeDeleteMessage(ctx, chatId, msgId);
  }
  if (ctx.callbackQuery?.message) {
    await safeDeleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id);
  }

  const updatedUser = (await updateUser(user.telegramId, { pendingMessageIds: [] }))!;

  if (user.profileCardMessageId) {
    await safeEditMessage(ctx, chatId, user.profileCardMessageId, profileCardSetup(updatedUser));
  }

  await showLanguageConfirmation(ctx, updatedUser);
  await ctx.answerCallbackQuery();
}

async function showLanguageConfirmation(ctx: BotContext, user: Awaited<ReturnType<typeof updateUser>>): Promise<void> {
  if (!user) return;
  const ul = user.language;
  const lang = getLanguage(user.language ?? '')?.name ?? user.language ?? 'Unknown';
  const dialect = user.dialect && user.dialect !== 'none' ? ` (${user.dialect})` : '';

  await updateUserState(user.telegramId, 'onboarding_confirm');

  const confirmMsg = await ctx.reply(
    t(ul, 'msg_lang_confirm', { lang: `${lang}${dialect}`, langName: lang }),
    {
      parse_mode: 'HTML',
      reply_markup: confirmLanguageKeyboard(ul),
    }
  );

  await updateUser(user.telegramId, { pendingMessageIds: [confirmMsg.message_id] });
}

export async function handleLanguageConfirm(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;

  // Delete everything: pending + callback + profile card
  await cleanAll(ctx, user);
  if (ctx.callbackQuery?.message) {
    await safeDeleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id);
  }

  await updateUser(user.telegramId, { pendingMessageIds: [], profileCardMessageId: undefined });

  // Ensure translations are cached before showing home
  if (user.language) {
    const langName = getLanguage(user.language)?.name ?? 'English';
    await ensureLanguageStrings(user.language, langName);
  }

  // Show unified home card
  await showHome(ctx, 'send');
  await ctx.answerCallbackQuery();
}

export async function handleLanguageChange(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;

  // Delete everything when changing language
  for (const msgId of user.pendingMessageIds) {
    await safeDeleteMessage(ctx, chatId, msgId);
  }
  if (ctx.callbackQuery?.message) {
    await safeDeleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id);
  }
  if (user.profileCardMessageId) {
    await safeDeleteMessage(ctx, chatId, user.profileCardMessageId);
  }

  // Re-send fresh profile card + language picker
  const cardMsg = await ctx.reply(profileCardSetup(user), { parse_mode: 'HTML' });

  const langMsg = await ctx.reply(t(user.language, 'msg_pick_language'), {
    reply_markup: languageKeyboard(0),
  });

  await updateUserState(user.telegramId, 'onboarding_lang', {
    pendingMessageIds: [langMsg.message_id],
    profileCardMessageId: cardMsg.message_id,
  });
  await ctx.answerCallbackQuery();
}
