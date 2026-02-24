import { Bot } from 'grammy';
import { config } from './config.js';
import { connectDB } from './db/connection.js';
import { BotContext, userMiddleware } from './bot/middleware.js';
import { handleStart, handleEnd, handleMenu, handleSettings } from './bot/commands.js';
import { handleCallback } from './bot/callbacks.js';
import { routeMessage } from './bot/message-router.js';
import { initI18n } from './ui/i18n.js';

async function main() {
  // Connect to MongoDB
  await connectDB();

  // Load cached translations into memory
  await initI18n();

  // Create bot
  const bot = new Bot<BotContext>(config.telegram.token);

  // Get bot info
  const me = await bot.api.getMe();
  (config.telegram as any).botUsername = me.username;
  console.log(`Bot: @${me.username}`);

  // Set commands
  await bot.api.setMyCommands([
    { command: 'start', description: 'Get started' },
    { command: 'end', description: 'End current conversation' },
    { command: 'menu', description: 'Show main menu' },
    { command: 'settings', description: 'Change language or dialect' },
  ]);

  // Middleware
  bot.use(userMiddleware as any);

  // Commands
  bot.command('start', handleStart as any);
  bot.command('end', handleEnd as any);
  bot.command('menu', handleMenu as any);
  bot.command('settings', handleSettings as any);

  // Callback queries (inline buttons)
  bot.on('callback_query:data', handleCallback as any);

  // Text messages
  bot.on('message:text', routeMessage as any);

  // Block/unblock detection
  bot.on('my_chat_member', async (ctx) => {
    const newStatus = ctx.myChatMember.new_chat_member.status;
    const userId = ctx.myChatMember.from.id;

    if (newStatus === 'kicked') {
      console.log(`User ${userId} blocked the bot`);
      // TODO: notify partner if in active chat
    } else if (newStatus === 'member') {
      console.log(`User ${userId} unblocked the bot`);
    }
  });

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  // Start polling
  console.log('Starting bot...');
  await bot.start({
    allowed_updates: [
      'message',
      'edited_message',
      'callback_query',
      'my_chat_member',
    ],
    onStart: () => console.log('Bot is running!'),
  });
}

main().catch(console.error);
