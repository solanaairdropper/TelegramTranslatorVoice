import { Context, NextFunction } from 'grammy';
import { findOrCreateUser } from '../db/queries.js';
import { IUser } from '../db/models/user.js';

// Extend grammY context with our user
export interface BotContext extends Context {
  dbUser: IUser;
}

export async function userMiddleware(ctx: BotContext, next: NextFunction): Promise<void> {
  const from = ctx.from;
  if (!from || from.is_bot) return;

  ctx.dbUser = await findOrCreateUser(
    from.id,
    from.first_name,
    from.username,
    from.last_name
  );

  await next();
}
