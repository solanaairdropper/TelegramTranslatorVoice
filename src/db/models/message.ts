import mongoose, { Schema, Document, Types } from 'mongoose';

export type MessageView = 'translation' | 'original' | 'literal' | 'clarify' | 'condense' | 'expand' | 'tone';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  senderId: string;
  receiverId: string;
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
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
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

messageSchema.index({ roomId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
