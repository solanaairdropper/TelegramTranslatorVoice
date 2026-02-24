import { BotContext } from './middleware.js';
import { handleChatMessage } from '../flows/chat.js';
import { handleCodeInput as joinCodeInput } from '../flows/session-join.js';
import { safeDeleteMessage } from './helpers.js';
import { t } from '../ui/i18n.js';

export async function routeMessage(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text;
  if (!text) return;

  // Don't process commands here
  if (text.startsWith('/')) return;

  const state = ctx.dbUser.state;
  const ul = ctx.dbUser.language;

  switch (state) {
    case 'in_chat':
      await handleChatMessage(ctx);
      break;

    case 'joining_enter_code':
      await handleCodeInput(ctx);
      break;

    case 'onboarding_lang':
    case 'onboarding_dialect':
    case 'onboarding_confirm':
      // These are handled by callbacks, ignore text input — auto-delete
      await autoDeleteReply(ctx, t(ul, 'msg_use_buttons'));
      break;

    case 'menu':
    case 'creating_session':
    case 'joining_session':
      await autoDeleteReply(ctx, t(ul, 'msg_use_menu'));
      break;

    default:
      await ctx.reply(t(ul, 'msg_type_start'));
  }
}

// Send a throwaway reply that auto-deletes after 3 seconds to keep chat clean
async function autoDeleteReply(ctx: BotContext, text: string): Promise<void> {
  const chatId = ctx.chat!.id;
  // Delete the user's message too
  if (ctx.message) {
    await safeDeleteMessage(ctx, chatId, ctx.message.message_id);
  }
  const msg = await ctx.reply(text);
  setTimeout(async () => {
    await safeDeleteMessage(ctx, chatId, msg.message_id);
  }, 3000);
}

export async function handleCodeInput(ctx: BotContext): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text) return;
  await joinCodeInput(ctx, text);
}

export { handleChatMessage };
