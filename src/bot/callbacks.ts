import { BotContext } from './middleware.js';
import { decode } from '../utils/callback-data.js';
import { handleLanguagePick, handleDialectPick, handleLanguageConfirm, handleLanguageChange } from '../flows/onboarding.js';
import { handleStartChat, handleCancelSession } from '../flows/session-create.js';
import {
  handleJoinChat,
  handleJoinCodeEntry,
  handleJoinConfirm,
  handleSelectSession,
} from '../flows/session-join.js';
import {
  handleSeeOriginal,
  handleSeeLiteral,
  handleClarify,
  handleCondense,
  handleExpand,
  handleToneCheck,
  handleDone,
  handleMoreOptions,
  handleEndChat,
  handleDeleteHistory,
  handleKeepHistory,
} from '../flows/chat.js';
import { showHome } from '../flows/returning.js';
import { settingsKeyboard } from '../ui/keyboards.js';
import { safeEditMessage, safeDeleteMessage, cleanAll } from '../bot/helpers.js';
import { t } from '../ui/i18n.js';

export async function handleCallback(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) {
    await ctx.answerCallbackQuery();
    return;
  }

  const { action, id } = decode(data);
  const ul = ctx.dbUser.language;

  try {
    switch (action) {
      // Language
      case 'lp':
        await handleLanguagePick(ctx, id ?? '');
        break;
      case 'dp':
        await handleDialectPick(ctx, id ?? 'none');
        break;
      case 'lc':
        await handleLanguageConfirm(ctx);
        break;
      case 'lx':
        await handleLanguageChange(ctx);
        break;

      // Start / cancel session
      case 'sc':
        if (id === 'copy') {
          await ctx.answerCallbackQuery({ text: t(ul, 'alert_copy_link') });
        } else {
          await handleStartChat(ctx);
        }
        break;
      case 'cs':
        await handleCancelSession(ctx);
        break;

      // Join
      case 'jn':
        await handleJoinChat(ctx);
        break;
      case 'jl':
        await handleSelectSession(ctx, id ?? '');
        break;
      case 'jc':
        await handleJoinCodeEntry(ctx);
        break;
      case 'ye':
        await handleJoinConfirm(ctx, id ?? '');
        break;
      case 'no': {
        // Clean confirmation message before going home
        const noUser = ctx.dbUser;
        await cleanAll(ctx, noUser);
        if (ctx.callbackQuery?.message) {
          await safeDeleteMessage(ctx, ctx.chat!.id, ctx.callbackQuery.message.message_id);
        }
        await showHome(ctx, 'send');
        await ctx.answerCallbackQuery();
        break;
      }

      // Settings
      case 'st': {
        const user = ctx.dbUser;
        if (user.profileCardMessageId) {
          await safeEditMessage(
            ctx, ctx.chat!.id, user.profileCardMessageId,
            t(ul, 'msg_settings'),
            { reply_markup: settingsKeyboard(ul) }
          );
        }
        await ctx.answerCallbackQuery();
        break;
      }

      // Back to menu
      case 'mn':
        await showHome(ctx, 'edit');
        await ctx.answerCallbackQuery();
        break;

      // Resume active chat
      case 'rc':
        await ctx.answerCallbackQuery({ text: t(ul, 'alert_just_type') });
        break;

      // End chat from menu
      case 'ec':
        await handleEndChat(ctx);
        await ctx.answerCallbackQuery();
        break;

      // Message submenu
      case 'mo':
        await handleMoreOptions(ctx, id ?? '');
        break;
      case 'o':
        await handleSeeOriginal(ctx, id ?? '');
        break;
      case 'l':
        await handleSeeLiteral(ctx, id ?? '');
        break;
      case 'c':
        await handleClarify(ctx, id ?? '');
        break;
      case 'n':
        await handleCondense(ctx, id ?? '');
        break;
      case 'x':
        await handleExpand(ctx, id ?? '');
        break;
      case 't':
        await handleToneCheck(ctx, id ?? '');
        break;
      case 'd':
        await handleDone(ctx, id ?? '');
        break;

      // Chat end options
      case 'dh':
        await handleDeleteHistory(ctx);
        break;
      case 'kh':
        await handleKeepHistory(ctx);
        break;

      default:
        await ctx.answerCallbackQuery();
    }
  } catch (err) {
    console.error(`Callback error [${action}]:`, err);
    await ctx.answerCallbackQuery({ text: t(ul, 'alert_error'), show_alert: true });
  }
}
