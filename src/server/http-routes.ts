import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  createRoom,
  findRoomByCode,
  findOrCreateParticipant,
  getParticipant,
  updateParticipant,
  getMessage,
  getRecentMessages,
  updateMessageField,
} from '../db/queries.js';
import { roomManager } from './room-manager.js';
import { getSpeechToken } from './speech-token.js';
import { cloneVoice, deleteVoice } from './elevenlabs.js';
import { clarifyMessage, condenseMessage, expandMessage, toneCheck } from '../ai/translate.js';
import { Types } from 'mongoose';
import { config } from '../config.js';

export const router = Router();

const COOKIE_NAME = 'vt_session';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year

// ── Identity endpoints ──

// Check if user has an existing profile
router.get('/api/me', async (req: Request, res: Response) => {
  try {
    const userId = req.cookies?.[COOKIE_NAME];
    if (!userId) {
      res.json({ exists: false });
      return;
    }

    const participant = await getParticipant(userId);
    if (!participant) {
      res.json({ exists: false });
      return;
    }

    res.json({
      exists: true,
      userId: participant.userId,
      displayName: participant.displayName,
      language: participant.language,
      dialect: participant.dialect,
      voiceId: participant.voiceId || null,
      recentRooms: participant.recentRooms || [],
    });
  } catch (err) {
    console.error('GET /api/me error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Create or update profile (onboarding)
router.post('/api/profile', async (req: Request, res: Response) => {
  try {
    const { displayName, language, dialect } = req.body;
    if (!displayName || !language) {
      res.status(400).json({ error: 'displayName and language are required' });
      return;
    }

    let userId = req.cookies?.[COOKIE_NAME];
    if (!userId) {
      userId = uuidv4();
    }

    const participant = await findOrCreateParticipant(userId, displayName, language, dialect);

    res.cookie(COOKIE_NAME, userId, {
      maxAge: COOKIE_MAX_AGE,
      path: '/voice',
      httpOnly: false,
      sameSite: 'lax',
    });

    res.json({
      userId: participant.userId,
      displayName: participant.displayName,
      language: participant.language,
      dialect: participant.dialect,
      voiceId: participant.voiceId || null,
    });
  } catch (err) {
    console.error('POST /api/profile error:', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Upload voice sample for cloning
// Body is parsed by express.raw() middleware in index.ts
router.post('/api/voice', async (req: Request, res: Response) => {
  try {
    const userId = req.cookies?.[COOKIE_NAME];
    if (!userId) {
      res.status(401).json({ error: 'No session cookie' });
      return;
    }

    const participant = await getParticipant(userId);
    if (!participant) {
      res.status(401).json({ error: 'Profile not found' });
      return;
    }

    const audioBuffer = req.body as Buffer;
    if (!audioBuffer || audioBuffer.length < 1000) {
      res.status(400).json({ error: 'Audio sample too small' });
      return;
    }

    const voiceId = await cloneVoice(`voice_${userId.slice(0, 8)}`, audioBuffer);
    await updateParticipant(userId, { voiceId } as any);

    res.json({ voiceId });
  } catch (err) {
    console.error('POST /api/voice error:', err);
    res.status(500).json({ error: 'Failed to clone voice' });
  }
});

// Re-record voice (delete old, clone new)
router.post('/api/voice/rerecord', async (req: Request, res: Response) => {
  try {
    const userId = req.cookies?.[COOKIE_NAME];
    if (!userId) {
      res.status(401).json({ error: 'No session cookie' });
      return;
    }

    const participant = await getParticipant(userId);
    if (!participant) {
      res.status(401).json({ error: 'Profile not found' });
      return;
    }

    // Delete old voice if it exists and isn't the default
    if (participant.voiceId && participant.voiceId !== config.elevenlabs.defaultVoiceId) {
      await deleteVoice(participant.voiceId);
    }

    const audioBuffer = req.body as Buffer;
    if (!audioBuffer || audioBuffer.length < 1000) {
      res.status(400).json({ error: 'Audio sample too small' });
      return;
    }

    const voiceId = await cloneVoice(`voice_${userId.slice(0, 8)}`, audioBuffer);
    await updateParticipant(userId, { voiceId } as any);

    res.json({ voiceId });
  } catch (err) {
    console.error('POST /api/voice/rerecord error:', err);
    res.status(500).json({ error: 'Failed to re-record voice' });
  }
});

// ── Room endpoints ──

// Create a room
router.post('/api/rooms', async (req: Request, res: Response) => {
  try {
    const userId = req.cookies?.[COOKIE_NAME];
    if (!userId) {
      res.status(401).json({ error: 'No session cookie — complete onboarding first' });
      return;
    }

    const participant = await getParticipant(userId);
    if (!participant) {
      res.status(401).json({ error: 'Profile not found — complete onboarding first' });
      return;
    }

    const room = await createRoom(
      participant.userId,
      participant.displayName,
      participant.language,
      participant.dialect
    );
    roomManager.createRoom(room.roomCode, room._id.toString());

    res.json({ roomCode: room.roomCode, userId: participant.userId });
  } catch (err) {
    console.error('POST /api/rooms error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room info
router.get('/api/rooms/:code', async (req: Request<{ code: string }>, res: Response) => {
  try {
    const room = await findRoomByCode(req.params.code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    res.json({
      roomCode: room.roomCode,
      status: room.status,
      creatorName: room.creatorName,
      creatorLanguage: room.creatorLanguage,
    });
  } catch (err) {
    console.error('GET /api/rooms/:code error:', err);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// Join a room
router.post('/api/rooms/:code/join', async (req: Request<{ code: string }>, res: Response) => {
  try {
    const userId = req.cookies?.[COOKIE_NAME];
    if (!userId) {
      res.status(401).json({ error: 'No session cookie — complete onboarding first' });
      return;
    }

    const participant = await getParticipant(userId);
    if (!participant) {
      res.status(401).json({ error: 'Profile not found — complete onboarding first' });
      return;
    }

    const room = await findRoomByCode(req.params.code);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    if (room.status !== 'waiting') {
      res.status(400).json({ error: 'Room is not available' });
      return;
    }

    res.json({ userId: participant.userId, roomCode: room.roomCode });
  } catch (err) {
    console.error('POST /api/rooms/:code/join error:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Azure Speech token
router.get('/api/speech-token', async (_req: Request, res: Response) => {
  try {
    const tokenData = await getSpeechToken();
    res.json(tokenData);
  } catch (err) {
    console.error('GET /api/speech-token error:', err);
    res.status(500).json({ error: 'Failed to get speech token' });
  }
});

// ── Lazy AI endpoints ──

router.get('/api/messages/:id/clarify', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const msg = await getMessage(new Types.ObjectId(req.params.id));
    if (!msg) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    if (msg.clarifyText) {
      res.json({ text: msg.clarifyText });
      return;
    }

    const recentMessages = await getRecentMessages(msg.roomId, 8);
    const context = recentMessages.map(m => `[${m.senderId}]: ${m.originalText}`).join('\n');

    const text = await clarifyMessage({
      originalText: msg.originalText,
      translatedText: msg.meaningTranslation,
      readerLanguage: 'auto',
      conversationContext: context,
    });

    await updateMessageField(msg._id, { clarifyText: text } as any);
    res.json({ text });
  } catch (err) {
    console.error('clarify error:', err);
    res.status(500).json({ error: 'Failed to clarify' });
  }
});

router.get('/api/messages/:id/condense', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const msg = await getMessage(new Types.ObjectId(req.params.id));
    if (!msg) { res.status(404).json({ error: 'Message not found' }); return; }
    if (msg.condenseText) { res.json({ text: msg.condenseText }); return; }

    const text = await condenseMessage(msg.meaningTranslation, 'auto');
    await updateMessageField(msg._id, { condenseText: text } as any);
    res.json({ text });
  } catch (err) {
    console.error('condense error:', err);
    res.status(500).json({ error: 'Failed to condense' });
  }
});

router.get('/api/messages/:id/expand', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const msg = await getMessage(new Types.ObjectId(req.params.id));
    if (!msg) { res.status(404).json({ error: 'Message not found' }); return; }
    if (msg.expandText) { res.json({ text: msg.expandText }); return; }

    const text = await expandMessage(msg.meaningTranslation, 'auto');
    await updateMessageField(msg._id, { expandText: text } as any);
    res.json({ text });
  } catch (err) {
    console.error('expand error:', err);
    res.status(500).json({ error: 'Failed to expand' });
  }
});

router.get('/api/messages/:id/tone', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const msg = await getMessage(new Types.ObjectId(req.params.id));
    if (!msg) { res.status(404).json({ error: 'Message not found' }); return; }
    if (msg.toneText) { res.json({ text: msg.toneText }); return; }

    const text = await toneCheck(msg.originalText, 'auto');
    await updateMessageField(msg._id, { toneText: text } as any);
    res.json({ text });
  } catch (err) {
    console.error('tone error:', err);
    res.status(500).json({ error: 'Failed to check tone' });
  }
});
