import mongoose from 'mongoose';
import { config } from '../config.js';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri, {
      dbName: 'telegram_translator',
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  }
}
