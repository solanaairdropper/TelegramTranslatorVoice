import { Types } from 'mongoose';
import { streamTranslation } from '../ai/stream.js';
import { translateMessage } from '../ai/translate.js';
import { buildConversationContext, buildUserProfile } from '../ai/context-builder.js';
import { isLowConfidence, analyzeStyle } from '../ai/analyze.js';
import { saveMessage, getParticipant, updateParticipant } from '../db/queries.js';
import { textToSpeech } from './elevenlabs.js';
import { roomManager } from './room-manager.js';
import { config } from '../config.js';
import { getLanguage } from '../utils/language-codes.js';

// Split text into sentences for incremental TTS
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by a space or end of string.
  // Handles ., !, ?, and their CJK equivalents.
  const parts = text.match(/[^.!?\u3002\uFF01\uFF1F]+[.!?\u3002\uFF01\uFF1F]+[\s]*/g);
  if (!parts || parts.length === 0) return [text];

  // Trim each part; filter out empty
  const sentences = parts.map(s => s.trim()).filter(s => s.length > 0);

  // If there's leftover text after all matches (no trailing punctuation), append it
  const matched = parts.join('');
  const remainder = text.slice(matched.length).trim();
  if (remainder.length > 0) {
    sentences.push(remainder);
  }

  return sentences;
}

export async function handleTranslation(
  roomCode: string,
  senderId: string,
  text: string
): Promise<void> {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  const senderInfo = roomManager.getParticipant(roomCode, senderId);
  const partner = roomManager.getPartner(roomCode, senderId);
  if (!senderInfo || !partner) return;

  const sender = senderInfo.participant;
  const roomId = new Types.ObjectId(room.roomId);

  // Get conversation context
  const conversationContext = await buildConversationContext(roomId, config.translation.contextWindowSize);

  // Build profiles
  const senderParticipant = await getParticipant(senderId);
  const receiverParticipant = await getParticipant(partner.userId);

  const senderProfile = senderParticipant
    ? buildUserProfile(senderParticipant)
    : `Name: ${sender.displayName}, Language: ${sender.language}`;
  const receiverProfile = receiverParticipant
    ? buildUserProfile(receiverParticipant)
    : `Name: ${partner.displayName}, Language: ${partner.language}`;

  const senderLang = getLanguage(sender.language)?.name ?? sender.language;
  const partnerLang = getLanguage(partner.language)?.name ?? partner.language;

  const messageId = new Types.ObjectId().toString();

  // Stream translation to partner
  let result;
  try {
    result = await streamTranslation(
      {
        originalText: text,
        sourceLanguage: senderLang,
        targetLanguage: partnerLang,
        targetDialect: partner.dialect,
        senderProfile,
        receiverProfile,
        conversationContext,
      },
      async (partial) => {
        partner.socket.emit('translation_chunk', {
          messageId,
          partial,
          isFinal: false,
        });
      }
    );
  } catch (err) {
    console.error('Stream translation failed, falling back:', err);
    result = await translateMessage({
      originalText: text,
      sourceLanguage: senderLang,
      targetLanguage: partnerLang,
      targetDialect: partner.dialect,
      senderProfile,
      receiverProfile,
      conversationContext,
    });
  }

  // Low confidence retry
  if (isLowConfidence(result.confidence)) {
    const expandedContext = await buildConversationContext(roomId, config.translation.expandedContextSize);
    try {
      result = await translateMessage({
        originalText: text,
        sourceLanguage: senderLang,
        targetLanguage: partnerLang,
        targetDialect: partner.dialect,
        senderProfile,
        receiverProfile,
        conversationContext: expandedContext,
      });
    } catch {
      // Keep original result
    }
  }

  // Save message to DB
  const savedMessage = await saveMessage({
    roomId,
    senderId,
    receiverId: partner.userId,
    originalText: text,
    literalTranslation: result.literal,
    meaningTranslation: result.translated,
    confidence: result.confidence,
    sentiment: result.sentiment,
  });

  // Send final translation to partner
  partner.socket.emit('translation_complete', {
    messageId,
    translated: result.translated,
    literal: result.literal,
    original: text,
    confidence: result.confidence,
    sentiment: result.sentiment,
    dbMessageId: savedMessage._id.toString(),
  });

  // Send confirmation to sender (include corrected text if different from original)
  sender.socket.emit('message_sent', {
    messageId,
    original: text,
    corrected: result.corrected && result.corrected !== text ? result.corrected : undefined,
    dbMessageId: savedMessage._id.toString(),
  });

  // Generate TTS audio — split into sentences and send each chunk as it's ready
  const voiceId = sender.voiceId || config.elevenlabs.defaultVoiceId;
  const targetLangCode = partner.language; // e.g. 'gu', 'en', 'sk'
  const sentences = splitSentences(result.translated);

  if (sentences.length <= 1) {
    // Single sentence: just send it
    try {
      const audioBuffer = await textToSpeech(voiceId, result.translated, targetLangCode);
      partner.socket.emit('audio_ready', {
        messageId,
        audio: audioBuffer.toString('base64'),
      });
    } catch (err) {
      console.error('TTS failed:', err);
    }
  } else {
    // Multiple sentences: TTS each one and stream audio chunks in order
    // Start all TTS calls in parallel, but send results in order
    const ttsPromises = sentences.map(sentence =>
      textToSpeech(voiceId, sentence, targetLangCode).catch(err => {
        console.error('TTS chunk failed:', err);
        return null;
      })
    );

    for (let i = 0; i < ttsPromises.length; i++) {
      const audioBuffer = await ttsPromises[i];
      if (audioBuffer) {
        partner.socket.emit('audio_chunk', {
          messageId,
          index: i,
          total: sentences.length,
          audio: audioBuffer.toString('base64'),
        });
      }
    }
  }

  // Update sender's style fingerprint
  const styleUpdate = analyzeStyle(text);
  await updateParticipant(senderId, { styleFingerprint: styleUpdate } as any);
}
