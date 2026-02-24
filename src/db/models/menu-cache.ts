import mongoose, { Schema, Document } from 'mongoose';

export interface IMenuCache extends Document {
  language: string;
  translations: Map<string, string>;
  updatedAt: Date;
}

const menuCacheSchema = new Schema<IMenuCache>({
  language: { type: String, required: true, unique: true },
  translations: { type: Map, of: String, default: new Map() },
  updatedAt: { type: Date, default: Date.now },
});

export const MenuCache = mongoose.model<IMenuCache>('MenuCache', menuCacheSchema);
