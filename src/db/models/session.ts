import mongoose, { Schema, Document, Types } from 'mongoose';

export type SessionStatus = 'waiting' | 'active' | 'ended';

export interface ISession extends Document {
  _id: Types.ObjectId;
  creatorId: number;
  joinerId?: number;
  creatorName: string;
  joinerName?: string;
  creatorLanguage: string;
  joinerLanguage?: string;
  inviteToken: string;
  joinCode: string;
  status: SessionStatus;
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

const sessionSchema = new Schema<ISession>({
  creatorId: { type: Number, required: true, index: true },
  joinerId: { type: Number, index: true },
  creatorName: { type: String, required: true },
  joinerName: String,
  creatorLanguage: { type: String, required: true },
  joinerLanguage: String,
  inviteToken: { type: String, required: true, unique: true, index: true },
  joinCode: { type: String, required: true },
  status: { type: String, default: 'waiting', index: true },
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

export const Session = mongoose.model<ISession>('Session', sessionSchema);
