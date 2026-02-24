import mongoose, { Schema, Document, Types } from 'mongoose';

export type MessageView = 'translation' | 'original' | 'literal' | 'clarify' | 'condense' | 'expand' | 'tone';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  senderId: number;
  receiverId: number;
  senderMessageId: number;
  receiverMessageId?: number;
  originalText: string;
  literalTranslation: string;
  meaningTranslation: string;
  confidence: number;
  sentiment: string;
  currentView: MessageView;
  clarifyText?: string;
  condenseText?: string;
  expandText?: string;
  toneText?: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true, index: true },
  senderId: { type: Number, required: true },
  receiverId: { type: Number, required: true },
  senderMessageId: { type: Number, required: true },
  receiverMessageId: Number,
  originalText: { type: String, required: true },
  literalTranslation: { type: String, default: '' },
  meaningTranslation: { type: String, default: '' },
  confidence: { type: Number, default: 1 },
  sentiment: { type: String, default: 'neutral' },
  currentView: { type: String, default: 'translation' },
  clarifyText: String,
  condenseText: String,
  expandText: String,
  toneText: String,
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ sessionId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
