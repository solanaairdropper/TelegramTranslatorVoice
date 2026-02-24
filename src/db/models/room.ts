import mongoose, { Schema, Document, Types } from 'mongoose';

export type RoomStatus = 'waiting' | 'voice_setup' | 'active' | 'ended';

export interface IRoom extends Document {
  _id: Types.ObjectId;
  roomCode: string;
  status: RoomStatus;
  creatorUserId: string;
  joinerUserId?: string;
  creatorName: string;
  joinerName?: string;
  creatorLanguage: string;
  joinerLanguage?: string;
  creatorDialect?: string;
  joinerDialect?: string;
  creatorVoiceId?: string;
  joinerVoiceId?: string;
  sentimentTimeline: Array<{
    timestamp: Date;
    sentiment: string;
    score: number;
  }>;
  relationshipTone: string;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

const roomSchema = new Schema<IRoom>({
  roomCode: { type: String, required: true, unique: true, index: true },
  status: { type: String, default: 'waiting', index: true },
  creatorUserId: { type: String, required: true },
  joinerUserId: String,
  creatorName: { type: String, required: true },
  joinerName: String,
  creatorLanguage: { type: String, required: true },
  joinerLanguage: String,
  creatorDialect: String,
  joinerDialect: String,
  creatorVoiceId: String,
  joinerVoiceId: String,
  sentimentTimeline: [{
    timestamp: { type: Date, default: Date.now },
    sentiment: String,
    score: Number,
  }],
  relationshipTone: { type: String, default: 'neutral' },
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  endedAt: Date,
});

export const Room = mongoose.model<IRoom>('Room', roomSchema);
