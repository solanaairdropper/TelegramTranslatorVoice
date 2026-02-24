import { Room, IRoom } from './models/room.js';
import { Participant, IParticipant } from './models/participant.js';
import { Message, IMessage } from './models/message.js';
import { Types } from 'mongoose';
import crypto from 'crypto';

// ── Participants ──

export async function findOrCreateParticipant(
  userId: string,
  displayName: string,
  language: string,
  dialect?: string
): Promise<IParticipant> {
  let participant = await Participant.findOne({ userId });
  if (participant) {
    participant.displayName = displayName;
    participant.language = language;
    if (dialect) participant.dialect = dialect;
    participant.lastActiveAt = new Date();
    await participant.save();
    return participant;
  }
  return Participant.create({ userId, displayName, language, dialect });
}

export async function getParticipant(userId: string): Promise<IParticipant | null> {
  return Participant.findOne({ userId });
}

export async function updateParticipant(userId: string, data: Partial<IParticipant>): Promise<IParticipant | null> {
  return Participant.findOneAndUpdate(
    { userId },
    { $set: { ...data, lastActiveAt: new Date() } },
    { new: true }
  );
}

// ── Rooms ──

function generateRoomCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export async function createRoom(
  creatorUserId: string,
  creatorName: string,
  creatorLanguage: string,
  creatorDialect?: string
): Promise<IRoom> {
  return Room.create({
    roomCode: generateRoomCode(),
    creatorUserId,
    creatorName,
    creatorLanguage,
    creatorDialect,
    status: 'waiting',
  });
}

export async function findRoomByCode(code: string): Promise<IRoom | null> {
  return Room.findOne({ roomCode: code.toUpperCase() });
}

export async function joinRoom(
  roomCode: string,
  joinerUserId: string,
  joinerName: string,
  joinerLanguage: string,
  joinerDialect?: string
): Promise<IRoom | null> {
  return Room.findOneAndUpdate(
    { roomCode: roomCode.toUpperCase(), status: 'waiting' },
    {
      $set: {
        joinerUserId,
        joinerName,
        joinerLanguage,
        joinerDialect,
        status: 'active',
        startedAt: new Date(),
      },
    },
    { new: true }
  );
}

export async function setRoomVoiceId(
  roomId: Types.ObjectId,
  role: 'creator' | 'joiner',
  voiceId: string
): Promise<IRoom | null> {
  const field = role === 'creator' ? 'creatorVoiceId' : 'joinerVoiceId';
  return Room.findByIdAndUpdate(roomId, { $set: { [field]: voiceId } }, { new: true });
}

export async function activateRoom(roomId: Types.ObjectId): Promise<IRoom | null> {
  return Room.findByIdAndUpdate(
    roomId,
    { $set: { status: 'active', startedAt: new Date() } },
    { new: true }
  );
}

export async function endRoom(roomId: Types.ObjectId): Promise<IRoom | null> {
  return Room.findByIdAndUpdate(
    roomId,
    { $set: { status: 'ended', endedAt: new Date() } },
    { new: true }
  );
}

export async function pushRecentRoom(userId: string, roomCode: string, partnerName: string): Promise<void> {
  await Participant.updateOne(
    { userId },
    {
      $push: {
        recentRooms: {
          $each: [{ roomCode, partnerName, createdAt: new Date() }],
          $slice: -4,
        },
      },
    }
  );
}

// ── Messages ──

export async function saveMessage(data: Partial<IMessage>): Promise<IMessage> {
  return Message.create(data);
}

export async function getMessage(messageId: Types.ObjectId): Promise<IMessage | null> {
  return Message.findById(messageId);
}

export async function getRecentMessages(roomId: Types.ObjectId, limit: number): Promise<IMessage[]> {
  return Message.find({ roomId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .then(msgs => msgs.reverse());
}

export async function updateMessageField(
  messageId: Types.ObjectId,
  fields: Partial<IMessage>
): Promise<IMessage | null> {
  return Message.findByIdAndUpdate(messageId, { $set: fields }, { new: true });
}
