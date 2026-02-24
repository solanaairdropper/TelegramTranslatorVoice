import { User, IUser } from './models/user.js';
import { Session, ISession } from './models/session.js';
import { Message, IMessage } from './models/message.js';
import { MenuCache } from './models/menu-cache.js';
import { Types } from 'mongoose';
import crypto from 'crypto';

// ── Users ──

export async function findOrCreateUser(telegramId: number, firstName: string, username?: string, lastName?: string): Promise<IUser> {
  let user = await User.findOne({ telegramId });
  if (user) {
    user.firstName = firstName;
    if (username) user.username = username;
    if (lastName) user.lastName = lastName;
    user.lastActiveAt = new Date();
    await user.save();
    return user;
  }
  return User.create({ telegramId, firstName, username, lastName });
}

export async function getUser(telegramId: number): Promise<IUser | null> {
  return User.findOne({ telegramId });
}

export async function updateUserState(telegramId: number, state: IUser['state'], extra?: Partial<IUser>): Promise<IUser | null> {
  return User.findOneAndUpdate(
    { telegramId },
    { $set: { state, lastActiveAt: new Date(), ...extra } },
    { new: true }
  );
}

export async function updateUser(telegramId: number, data: Partial<IUser>): Promise<IUser | null> {
  return User.findOneAndUpdate(
    { telegramId },
    { $set: { ...data, lastActiveAt: new Date() } },
    { new: true }
  );
}

export async function addPastPartner(telegramId: number, partner: { telegramId: number; firstName: string }): Promise<void> {
  await User.findOneAndUpdate(
    { telegramId },
    { $push: { pastPartners: { telegramId: partner.telegramId, firstName: partner.firstName, lastChatDate: new Date() } } }
  );
}

// ── Sessions ──

function generateToken(): string {
  return crypto.randomBytes(6).toString('base64url');
}

function generateCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createSession(creatorId: number, creatorName: string, creatorLanguage: string): Promise<ISession> {
  const session = await Session.create({
    creatorId,
    creatorName,
    creatorLanguage,
    inviteToken: generateToken(),
    joinCode: generateCode(),
    status: 'waiting',
  });
  return session;
}

export async function findSessionByToken(token: string): Promise<ISession | null> {
  return Session.findOne({ inviteToken: token, status: 'waiting' });
}

export async function findSessionByCode(code: string): Promise<ISession | null> {
  return Session.findOne({ joinCode: code, status: 'waiting' });
}

export async function findWaitingSessions(): Promise<ISession[]> {
  return Session.find({ status: 'waiting' }).sort({ createdAt: -1 }).limit(20);
}

export async function findActiveSessionForUser(telegramId: number): Promise<ISession | null> {
  return Session.findOne({
    status: 'active',
    $or: [{ creatorId: telegramId }, { joinerId: telegramId }],
  });
}

export async function activateSession(sessionId: Types.ObjectId, joinerId: number, joinerName: string, joinerLanguage: string): Promise<ISession | null> {
  return Session.findByIdAndUpdate(sessionId, {
    $set: {
      joinerId,
      joinerName,
      joinerLanguage,
      status: 'active',
      startedAt: new Date(),
    },
  }, { new: true });
}

export async function endSession(sessionId: Types.ObjectId): Promise<ISession | null> {
  return Session.findByIdAndUpdate(sessionId, {
    $set: { status: 'ended', endedAt: new Date() },
  }, { new: true });
}

// ── Messages ──

export async function saveMessage(data: Partial<IMessage>): Promise<IMessage> {
  return Message.create(data);
}

export async function getMessageByReceiverMsgId(receiverId: number, receiverMessageId: number): Promise<IMessage | null> {
  return Message.findOne({ receiverId, receiverMessageId });
}

export async function getRecentMessages(sessionId: Types.ObjectId, limit: number): Promise<IMessage[]> {
  return Message.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .then(msgs => msgs.reverse());
}

export async function updateMessageView(messageId: Types.ObjectId, view: IMessage['currentView'], extraFields?: Partial<IMessage>): Promise<IMessage | null> {
  return Message.findByIdAndUpdate(messageId, {
    $set: { currentView: view, ...extraFields },
  }, { new: true });
}

export async function deleteMessagesForSession(sessionId: Types.ObjectId): Promise<void> {
  await Message.deleteMany({ sessionId });
}

// ── Menu Cache ──

export async function getCachedMenu(language: string): Promise<Map<string, string> | null> {
  const cache = await MenuCache.findOne({ language });
  return cache?.translations ?? null;
}

export async function setCachedMenu(language: string, translations: Map<string, string>): Promise<void> {
  await MenuCache.findOneAndUpdate(
    { language },
    { $set: { translations, updatedAt: new Date() } },
    { upsert: true }
  );
}
