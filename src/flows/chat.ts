import { BotContext } from '../bot/middleware.js';
import {
  getUser,
  findActiveSessionForUser,
  getRecentMessages,
  saveMessage,
  updateMessageView,
  getMessageByReceiverMsgId,
  endSession,
  updateUserState,
  updateUser,
  addPastPartner,
} from '../db/queries.js';
import {
  translateMessage,
  clarifyMessage,
  condenseMessage,
  expandMessage,
  toneCheck,
  detectConfusion,
  TranslationResult,
} from '../ai/translate.js';
import { streamTranslation } from '../ai/stream.js';
import { buildConversationContext, buildUserProfile } from '../ai/context-builder.js';
import { mightBeConfused, isLowConfidence, analyzeStyle } from '../ai/analyze.js';
import { translationButtonsKeyboard, translationSubmenuKeyboard, doneKeyboard, endChatKeyboard } from '../ui/keyboards.js';
import { safeEditMessage, safeDeleteMessage, escapeHtml, cleanAll } from '../bot/helpers.js';
import { chatEndedSeparator } from '../ui/separators.js';
import { showHome, showHomeForUser } from './returning.js';
import { getLanguage } from '../utils/language-codes.js';
import { config } from '../config.js';
import { t, getLoadingText } from '../ui/i18n.js';

export async function handleChatMessage(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const text = ctx.message?.text;
  if (!text) return;

  const session = await findActiveSessionForUser(user.telegramId);
  if (!session) {
    await ctx.reply(t(user.language, 'msg_not_in_chat'));
    return;
  }

  // Determine partner
  const partnerId = session.creatorId === user.telegramId ? session.joinerId : session.creatorId;
  if (!partnerId) return;

  const partner = await getUser(partnerId);
  if (!partner) return;

  // Show typing indicator to partner
  ctx.api.sendChatAction(partnerId, 'typing').catch(() => {});

  // Build context
  const recentMessages = await getRecentMessages(session._id, config.translation.contextWindowSize);
  const conversationContext = recentMessages
    .map(m => `[${m.senderId === user.telegramId ? 'sender' : 'receiver'}]: ${m.originalText}`)
    .join('\n');

  // Check for confusion
  if (mightBeConfused(text) && recentMessages.length > 0) {
    const lastMsg = recentMessages[recentMessages.length - 1];
    if (lastMsg.receiverId === user.telegramId && lastMsg.receiverMessageId) {
      try {
        const confusion = await detectConfusion({
          recentMessages: conversationContext,
          lastTranslation: lastMsg.meaningTranslation,
          userResponse: text,
        });

        if (confusion.isTranslationConfusion && confusion.suggestedRetranslation) {
          await safeEditMessage(
            ctx, user.telegramId, lastMsg.receiverMessageId,
            escapeHtml(confusion.suggestedRetranslation),
            { reply_markup: translationButtonsKeyboard(lastMsg._id.toString()) }
          );
          await updateMessageView(lastMsg._id, 'translation', {
            meaningTranslation: confusion.suggestedRetranslation,
          });
        }
      } catch {
        // Confusion detection failed, continue normally
      }
    }
  }

  // Translate
  const senderProfile = buildUserProfile(user);
  const receiverProfile = buildUserProfile(partner);
  const sourceLanguage = getLanguage(user.language ?? 'en')?.name ?? 'English';
  const targetLanguage = getLanguage(partner.language ?? 'en')?.name ?? 'English';

  // Send placeholder message to partner (loading text in PARTNER's language), then stream
  const placeholderMsg = await ctx.api.sendMessage(
    partnerId,
    getLoadingText(partner.language),
    { parse_mode: 'HTML' }
  );

  let result: TranslationResult;
  try {
    result = await streamTranslation(
      {
        originalText: text,
        sourceLanguage,
        targetLanguage,
        targetDialect: partner.dialect,
        senderProfile,
        receiverProfile,
        conversationContext,
        sentiment: session.sentimentTimeline.length > 0
          ? session.sentimentTimeline[session.sentimentTimeline.length - 1].sentiment
          : undefined,
        relationshipTone: session.relationshipTone,
      },
      // Stream callback: edit the placeholder as tokens arrive
      async (partialText: string) => {
        await safeEditMessage(ctx, partnerId, placeholderMsg.message_id, escapeHtml(partialText));
      }
    );
  } catch (err) {
    console.error('Translation failed:', err);
    result = {
      literal: text,
      translated: text,
      confidence: 0.5,
      sentiment: 'neutral',
    };
  }

  // If low confidence, retry with more context
  if (isLowConfidence(result.confidence)) {
    const expandedMessages = await getRecentMessages(session._id, config.translation.expandedContextSize);
    const expandedContext = expandedMessages
      .map(m => `[${m.senderId === user.telegramId ? 'sender' : 'receiver'}]: ${m.originalText}`)
      .join('\n');

    try {
      result = await translateMessage({
        originalText: text,
        sourceLanguage,
        targetLanguage,
        targetDialect: partner.dialect,
        senderProfile,
        receiverProfile,
        conversationContext: expandedContext,
      });
    } catch {
      // Keep original result
    }
  }

  // Save message to DB
  const msgDoc = await saveMessage({
    sessionId: session._id,
    senderId: user.telegramId,
    receiverId: partnerId,
    senderMessageId: ctx.message!.message_id,
    receiverMessageId: placeholderMsg.message_id,
    originalText: text,
    literalTranslation: result.literal,
    meaningTranslation: result.translated,
    confidence: result.confidence,
    sentiment: result.sentiment,
  });

  // Final edit with the complete translation + button
  await safeEditMessage(
    ctx, partnerId, placeholderMsg.message_id,
    escapeHtml(result.translated),
    { reply_markup: translationButtonsKeyboard(msgDoc._id.toString()) }
  );

  // Update style fingerprint periodically
  const style = analyzeStyle(text);
  await updateUser(user.telegramId, { styleFingerprint: style });
}

// ── More Options (open submenu) ──

export async function handleMoreOptions(ctx: BotContext, messageId: string): Promise<void> {
  const msg = await getMessageDoc(messageId);
  if (!msg) return ack(ctx);

  const ul = ctx.dbUser.language;

  // Edit the message to show submenu buttons
  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    escapeHtml(msg.meaningTranslation),
    { reply_markup: translationSubmenuKeyboard(messageId, ul) }
  );
  await ctx.answerCallbackQuery();
}

// ── Inline Button Handlers ──

export async function handleSeeOriginal(ctx: BotContext, messageId: string): Promise<void> {
  const msg = await getMessageDoc(messageId);
  if (!msg) return ack(ctx);

  const ul = ctx.dbUser.language;
  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    `${t(ul, 'label_original')}\n<pre>${escapeHtml(msg.originalText)}</pre>`,
    { reply_markup: doneKeyboard(messageId, ul) }
  );
  await updateMessageView(msg._id, 'original');
  await ctx.answerCallbackQuery();
}

export async function handleSeeLiteral(ctx: BotContext, messageId: string): Promise<void> {
  const msg = await getMessageDoc(messageId);
  if (!msg) return ack(ctx);

  const ul = ctx.dbUser.language;
  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    `${t(ul, 'label_literal')}\n${escapeHtml(msg.literalTranslation)}`,
    { reply_markup: doneKeyboard(messageId, ul) }
  );
  await updateMessageView(msg._id, 'literal');
  await ctx.answerCallbackQuery();
}

export async function handleClarify(ctx: BotContext, messageId: string): Promise<void> {
  const msg = await getMessageDoc(messageId);
  if (!msg) return ack(ctx);

  const ul = ctx.dbUser.language;
  await ctx.answerCallbackQuery();

  // Show loading state
  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    getLoadingText(ul),
    { reply_markup: undefined }
  );

  if (!msg.clarifyText) {
    const receiver = await getUser(msg.receiverId);
    const context = await buildConversationContext(msg.sessionId, config.translation.expandedContextSize);

    const clarification = await clarifyMessage({
      originalText: msg.originalText,
      translatedText: msg.meaningTranslation,
      readerLanguage: getLanguage(receiver?.language ?? 'en')?.name ?? 'English',
      conversationContext: context,
    });

    msg.clarifyText = clarification;
    await msg.save();
  }

  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    `${t(ul, 'label_meaning')}\n${escapeHtml(msg.clarifyText)}`,
    { reply_markup: doneKeyboard(messageId, ul) }
  );
  await updateMessageView(msg._id, 'clarify');
}

export async function handleCondense(ctx: BotContext, messageId: string): Promise<void> {
  const msg = await getMessageDoc(messageId);
  if (!msg) return ack(ctx);

  const ul = ctx.dbUser.language;
  await ctx.answerCallbackQuery();

  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    getLoadingText(ul),
    { reply_markup: undefined }
  );

  if (!msg.condenseText) {
    const receiver = await getUser(msg.receiverId);
    const condensed = await condenseMessage(
      msg.meaningTranslation,
      getLanguage(receiver?.language ?? 'en')?.name ?? 'English'
    );
    msg.condenseText = condensed;
    await msg.save();
  }

  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    `${t(ul, 'label_condensed')}\n${escapeHtml(msg.condenseText)}`,
    { reply_markup: doneKeyboard(messageId, ul) }
  );
  await updateMessageView(msg._id, 'condense');
}

export async function handleExpand(ctx: BotContext, messageId: string): Promise<void> {
  const msg = await getMessageDoc(messageId);
  if (!msg) return ack(ctx);

  const ul = ctx.dbUser.language;
  await ctx.answerCallbackQuery();

  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    getLoadingText(ul),
    { reply_markup: undefined }
  );

  if (!msg.expandText) {
    const receiver = await getUser(msg.receiverId);
    const context = await buildConversationContext(msg.sessionId, config.translation.contextWindowSize);
    const expanded = await expandMessage(
      msg.meaningTranslation,
      getLanguage(receiver?.language ?? 'en')?.name ?? 'English',
      context
    );
    msg.expandText = expanded;
    await msg.save();
  }

  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    `${t(ul, 'label_expanded')}\n${escapeHtml(msg.expandText)}`,
    { reply_markup: doneKeyboard(messageId, ul) }
  );
  await updateMessageView(msg._id, 'expand');
}

export async function handleToneCheck(ctx: BotContext, messageId: string): Promise<void> {
  const msg = await getMessageDoc(messageId);
  if (!msg) return ack(ctx);

  const ul = ctx.dbUser.language;
  await ctx.answerCallbackQuery();

  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    getLoadingText(ul),
    { reply_markup: undefined }
  );

  if (!msg.toneText) {
    const receiver = await getUser(msg.receiverId);
    const context = await buildConversationContext(msg.sessionId, config.translation.contextWindowSize);
    const tone = await toneCheck(
      msg.originalText,
      getLanguage(receiver?.language ?? 'en')?.name ?? 'English',
      context
    );
    msg.toneText = tone;
    await msg.save();
  }

  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    `${t(ul, 'label_tone')}\n${escapeHtml(msg.toneText)}`,
    { reply_markup: doneKeyboard(messageId, ul) }
  );
  await updateMessageView(msg._id, 'tone');
}

export async function handleDone(ctx: BotContext, messageId: string): Promise<void> {
  const msg = await getMessageDoc(messageId);
  if (!msg) return ack(ctx);

  // Revert to main translation view with single "..." button
  await safeEditMessage(
    ctx, ctx.chat!.id, msg.receiverMessageId!,
    escapeHtml(msg.meaningTranslation),
    { reply_markup: translationButtonsKeyboard(messageId) }
  );
  await updateMessageView(msg._id, 'translation');
  await ctx.answerCallbackQuery();
}

// ── End Chat ──

export async function handleEndChat(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const ul = user.language;
  const session = await findActiveSessionForUser(user.telegramId);
  if (!session) {
    await ctx.reply(t(ul, 'alert_not_in_chat'));
    return;
  }

  const ended = await endSession(session._id);
  if (!ended) return;

  const endTime = new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const partnerId = session.creatorId === user.telegramId ? session.joinerId : session.creatorId;

  // Clean any tracked messages before showing end-chat UI
  await cleanAll(ctx, user);

  // Send ended separator + delete prompt, track them
  const sepMsg = await ctx.reply(chatEndedSeparator(endTime, ul), { parse_mode: 'HTML' });
  const deleteMsg = await ctx.reply(t(ul, 'msg_delete_history_prompt'), {
    reply_markup: endChatKeyboard(ul),
  });

  await updateUserState(user.telegramId, 'idle', {
    currentSessionId: undefined,
    pendingMessageIds: [sepMsg.message_id, deleteMsg.message_id],
    profileCardMessageId: undefined,
    menuMessageId: undefined,
  });

  if (partnerId) {
    const partner = await getUser(partnerId);
    if (partner) {
      const cl = partner.language;
      await addPastPartner(user.telegramId, { telegramId: partnerId, firstName: partner.firstName });
      await addPastPartner(partnerId, { telegramId: user.telegramId, firstName: user.firstName });

      // Clean partner's tracked messages too
      await cleanAll(ctx, partner);

      const partnerSepMsg = await ctx.api.sendMessage(partnerId, chatEndedSeparator(endTime, cl), { parse_mode: 'HTML' });
      const partnerDeleteMsg = await ctx.api.sendMessage(partnerId, t(cl, 'msg_partner_disconnected'), {
        reply_markup: endChatKeyboard(cl),
      });
      await updateUserState(partnerId, 'idle', {
        currentSessionId: undefined,
        pendingMessageIds: [partnerSepMsg.message_id, partnerDeleteMsg.message_id],
        profileCardMessageId: undefined,
        menuMessageId: undefined,
      });
    }
  }
}

export async function handleDeleteHistory(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  // Clean end-chat messages
  await cleanAll(ctx, user);
  if (ctx.callbackQuery?.message) {
    await safeDeleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id);
  }

  await ctx.answerCallbackQuery({ text: t(ul, 'alert_history_deleted') });
  await showHome(ctx, 'send');
}

export async function handleKeepHistory(ctx: BotContext): Promise<void> {
  const user = ctx.dbUser;
  const chatId = ctx.chat!.id;
  const ul = user.language;

  // Clean end-chat messages
  await cleanAll(ctx, user);
  if (ctx.callbackQuery?.message) {
    await safeDeleteMessage(ctx, chatId, ctx.callbackQuery.message.message_id);
  }

  await ctx.answerCallbackQuery({ text: t(ul, 'alert_history_kept') });
  await showHome(ctx, 'send');
}

// ── Helpers ──

async function getMessageDoc(messageId: string) {
  const { Message } = await import('../db/models/message.js');
  const { Types } = await import('mongoose');
  try {
    return await Message.findById(new Types.ObjectId(messageId));
  } catch {
    return null;
  }
}

async function ack(ctx: BotContext) {
  await ctx.answerCallbackQuery({ text: t(ctx.dbUser.language, 'alert_not_found'), show_alert: true });
}
