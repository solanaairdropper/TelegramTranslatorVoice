import mongoose, { Schema, Document, Types } from 'mongoose';

export type UserState =
  | 'new'
  | 'onboarding_lang'
  | 'onboarding_dialect'
  | 'onboarding_confirm'
  | 'menu'
  | 'creating_session'
  | 'joining_session'
  | 'joining_enter_code'
  | 'in_chat'
  | 'idle';

export interface IUser extends Document {
  _id: Types.ObjectId;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  language?: string;
  dialect?: string;
  timezone?: string;
  location?: string;
  styleFingerprint?: {
    usesSlang: boolean;
    usesEmoji: boolean;
    averageLength: number;
    punctuationStyle: string;
    casingStyle: string;
  };
  state: UserState;
  currentSessionId?: Types.ObjectId;
  pastPartners: Array<{
    telegramId: number;
    firstName: string;
    lastChatDate: Date;
  }>;
  profileCardMessageId?: number;
  menuMessageId?: number;
  pendingMessageIds: number[];
  createdAt: Date;
  lastActiveAt: Date;
}

const userSchema = new Schema<IUser>({
  telegramId: { type: Number, required: true, unique: true, index: true },
  username: String,
  firstName: { type: String, required: true },
  lastName: String,
  language: String,
  dialect: String,
  timezone: String,
  location: String,
  styleFingerprint: {
    usesSlang: { type: Boolean, default: false },
    usesEmoji: { type: Boolean, default: false },
    averageLength: { type: Number, default: 0 },
    punctuationStyle: { type: String, default: 'standard' },
    casingStyle: { type: String, default: 'normal' },
  },
  state: { type: String, default: 'new' },
  currentSessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
  pastPartners: [{
    telegramId: Number,
    firstName: String,
    lastChatDate: Date,
  }],
  profileCardMessageId: Number,
  menuMessageId: Number,
  pendingMessageIds: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', userSchema);
