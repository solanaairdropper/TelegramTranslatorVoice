import { getRecentMessages } from '../db/queries.js';
import { IMessage } from '../db/models/message.js';
import { IParticipant } from '../db/models/participant.js';
import { Types } from 'mongoose';
import { getLanguage } from '../utils/language-codes.js';

export async function buildConversationContext(
  roomId: Types.ObjectId,
  messageCount: number
): Promise<string> {
  const messages = await getRecentMessages(roomId, messageCount);
  if (messages.length === 0) return '';

  return messages
    .map(m => `[${m.senderId}]: ${m.originalText}`)
    .join('\n');
}

export function buildUserProfile(participant: IParticipant): string {
  const parts: string[] = [];
  parts.push(`Name: ${participant.displayName}`);
  if (participant.language) {
    const lang = getLanguage(participant.language);
    parts.push(`Language: ${lang?.name ?? participant.language}`);
  }
  if (participant.dialect) parts.push(`Dialect: ${participant.dialect}`);
  if (participant.styleFingerprint) {
    const fp = participant.styleFingerprint;
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
