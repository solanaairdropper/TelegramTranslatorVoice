import mongoose, { Schema, Document } from 'mongoose';

export interface IParticipant extends Document {
  userId: string;
  displayName: string;
  language: string;
  dialect?: string;
  voiceId?: string;
  recentRooms: Array<{ roomCode: string; partnerName: string; createdAt: Date }>;
  styleFingerprint?: {
    usesSlang: boolean;
    usesEmoji: boolean;
    averageLength: number;
    punctuationStyle: string;
    casingStyle: string;
  };
  createdAt: Date;
  lastActiveAt: Date;
}

const participantSchema = new Schema<IParticipant>({
  userId: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  language: { type: String, required: true },
  dialect: String,
  voiceId: String,
  recentRooms: {
    type: [{ roomCode: String, partnerName: String, createdAt: { type: Date, default: Date.now } }],
    default: [],
  },
  styleFingerprint: {
    usesSlang: { type: Boolean, default: false },
    usesEmoji: { type: Boolean, default: false },
    averageLength: { type: Number, default: 0 },
    punctuationStyle: { type: String, default: 'standard' },
    casingStyle: { type: String, default: 'normal' },
  },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
});

export const Participant = mongoose.model<IParticipant>('Participant', participantSchema);
