import { getRecentMessages } from '../db/queries.js';
import { getUser } from '../db/queries.js';
import { IMessage } from '../db/models/message.js';
import { IUser } from '../db/models/user.js';
import { Types } from 'mongoose';
import { getLanguage } from '../utils/language-codes.js';

export async function buildConversationContext(
  sessionId: Types.ObjectId,
  messageCount: number
): Promise<string> {
  const messages = await getRecentMessages(sessionId, messageCount);
  if (messages.length === 0) return '';

  return messages
    .map(m => `[${m.senderId}]: ${m.originalText}`)
    .join('\n');
}

export function buildUserProfile(user: IUser): string {
  const parts: string[] = [];
  parts.push(`Name: ${user.firstName}`);
  if (user.language) {
    const lang = getLanguage(user.language);
    parts.push(`Language: ${lang?.name ?? user.language}`);
  }
  if (user.dialect) parts.push(`Dialect: ${user.dialect}`);
  if (user.styleFingerprint) {
    const fp = user.styleFingerprint;
    if (fp.usesSlang) parts.push('Uses slang');
    if (fp.usesEmoji) parts.push('Uses emoji');
    if (fp.casingStyle !== 'normal') parts.push(`Casing: ${fp.casingStyle}`);
  }
  return parts.join(', ');
}

export function buildContextForMessage(
  recentMessages: IMessage[],
  senderProfile: string,
  receiverProfile: string,
  sentiment?: string,
  relationshipTone?: string
): {
  conversationContext: string;
  senderProfile: string;
  receiverProfile: string;
  sentiment?: string;
  relationshipTone?: string;
} {
  const conversationContext = recentMessages
    .map(m => `[${m.senderId}]: ${m.originalText}`)
    .join('\n');

  return {
    conversationContext,
    senderProfile,
    receiverProfile,
    sentiment,
    relationshipTone,
  };
}
