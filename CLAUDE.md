# Voice Translator — Real-time Voice-to-Voice Web App

AI-powered web app that enables real-time translated voice conversations between two people who speak different languages. Each user speaks in their own language, sees streaming translated text, and hears the translation spoken in the original speaker's cloned voice.

## Tech Stack

- **Runtime**: Node.js with TypeScript (ES2022, ESM modules)
- **Server**: Express 4 + Socket.IO 4
- **AI Translation**: Azure OpenAI (via `openai` SDK v6, using `AzureOpenAI` client)
- **Speech-to-Text**: Azure Speech SDK (runs in browser, direct to Azure)
- **Text-to-Speech + Voice Cloning**: ElevenLabs API (server-side)
- **Database**: MongoDB via Mongoose v8
- **Frontend**: Vanilla HTML/CSS/JS (no framework)
- **Dev**: tsx for dev/run, tsc for typechecking

## Commands

```bash
npm run dev        # tsx watch src/index.ts (hot reload)
npm run start      # tsx src/index.ts
npm run build      # tsc
npm run typecheck   # tsc --noEmit
```

## Environment Variables (all required)

| Variable | Purpose |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | Azure model deployment name |
| `AZURE_OPENAI_API_VERSION` | Azure API version string |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `AZURE_SPEECH_KEY` | Azure Speech Services subscription key |
| `AZURE_SPEECH_REGION` | Azure Speech region (e.g. `eastus2`) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `MONGODB_URI` | MongoDB connection string |

Optional:
| `PORT` | Server port (default: 3000) |
| `ELEVENLABS_DEFAULT_VOICE` | Fallback ElevenLabs voice ID |

Config is loaded in `src/config.ts` via `dotenv/config`.

---

## Project Structure

```
src/
  index.ts                      # Entry: Express + Socket.IO + MongoDB
  config.ts                     # Env var loading + translation config constants
  ai/
    client.ts                   # Azure OpenAI singleton + chatCompletion/JSON helpers
    prompts.ts                  # All system prompts and user prompt builders
    translate.ts                # Translation functions: translate, clarify, condense, expand, tone, confusion
    stream.ts                   # Streaming translation with throttled onChunk callback
    context-builder.ts          # Builds conversation context strings and user profiles for AI
    analyze.ts                  # Confusion detection phrases, confidence check, style fingerprinting
  server/
    http-routes.ts              # REST API: rooms, speech-token, lazy AI endpoints
    ws-handler.ts               # Socket.IO event dispatch (join_room, phrase_recognized, etc.)
    room-manager.ts             # In-memory live state: Map<roomCode, RoomState>
    voice-pipeline.ts           # Orchestrates: text → streamTranslation → ElevenLabs TTS
    elevenlabs.ts               # cloneVoice(buffer) → voiceId; textToSpeech(voiceId, text) → Buffer
    speech-token.ts             # Azure STS token endpoint
  db/
    connection.ts               # mongoose.connect wrapper
    queries.ts                  # All DB query functions (participants, rooms, messages)
    models/
      room.ts                   # Room model + IRoom interface + RoomStatus type
      participant.ts            # Participant model + IParticipant interface
      message.ts                # Message model + IMessage interface + MessageView type
  utils/
    language-codes.ts           # 24 supported languages with codes, flags, native names, dialects
public/
  index.html                    # Landing: create or join room
  room.html                     # Active room: bubbles + mic + text input + voice setup
  style.css                     # Dark theme styles
  js/
    app.js                      # Landing page logic
    room.js                     # Room: Socket.IO client, Azure Speech SDK, audio playback
```

---

## Voice Pipeline Flow

```
User A toggles mic ON
  → Azure Speech SDK (browser, direct to Azure) starts continuous recognition
  → recognizing events → send phrase_recognized(isFinal:false) → server relays as partner_typing
  → recognized event (final phrase)
  → send phrase_recognized(isFinal:true) to server

Server receives final phrase:
  1. Call streamTranslation(params, onChunk) — streams translation_chunk events to partner
  2. On complete: save to DB, send translation_complete to both users
  3. Call ElevenLabs TTS on full translated text using sender's cloned voice
  4. Send audio as base64 → partner plays via Audio(blobURL)
```

## Socket.IO Protocol

### Client → Server
- `join_room` { roomCode, userId, displayName, language, dialect? }
- `phrase_recognized` { roomCode, userId, text, isFinal }
- `send_text` { roomCode, userId, text } — text input fallback
- `typing` { roomCode, userId, isTyping }
- `voice_sample` { roomCode, userId, audio: ArrayBuffer }
- `skip_voice_setup` { roomCode, userId }
- `end_room` { roomCode, userId }

### Server → Client
- `room_joined` { roomCode, status, partnerName?, partnerLanguage?, yourRole }
- `partner_joined` { partnerName, partnerLanguage }
- `voice_setup_start` {}
- `voice_clone_status` { forUser, status }
- `voice_setup_complete` {}
- `partner_typing` { isSpeaking, partialText?, isTyping? }
- `translation_chunk` { messageId, partial, isFinal }
- `translation_complete` { messageId, translated, literal, original, confidence, sentiment, dbMessageId }
- `audio_ready` { messageId, audio (base64) }
- `message_sent` { messageId, original, dbMessageId }
- `room_ended` { endedBy }
- `partner_disconnected` {}
- `error_msg` { code, message }

## HTTP Routes

```
POST /api/rooms                    Create room → { roomCode, userId }
GET  /api/rooms/:code              Room info → { roomCode, status, creatorName, creatorLanguage }
POST /api/rooms/:code/join         Join room → { userId, roomCode }
GET  /api/speech-token             Azure Speech auth token → { token, region }
GET  /api/messages/:id/clarify     Lazy AI: clarify
GET  /api/messages/:id/condense    Lazy AI: condense
GET  /api/messages/:id/expand      Lazy AI: expand
GET  /api/messages/:id/tone        Lazy AI: tone check
GET  /                             Serve landing page
GET  /room/:code                   Serve room page
```

## DB Models

### Room (`rooms` collection)
- `roomCode` (string, unique, indexed) — 6-char hex
- `status` ('waiting' | 'voice_setup' | 'active' | 'ended')
- `creatorUserId`, `joinerUserId` (string UUIDs)
- `creatorName`, `joinerName`, `creatorLanguage`, `joinerLanguage`
- `creatorDialect`, `joinerDialect`, `creatorVoiceId`, `joinerVoiceId`
- `sentimentTimeline`, `relationshipTone`

### Participant (`participants` collection)
- `userId` (string UUID, unique)
- `displayName`, `language`, `dialect?`, `voiceId?`
- `styleFingerprint` { usesSlang, usesEmoji, averageLength, punctuationStyle, casingStyle }

### Message (`messages` collection)
- `roomId` (ObjectId ref)
- `senderId`, `receiverId` (string UUIDs)
- `originalText`, `literalTranslation`, `meaningTranslation`
- `confidence`, `sentiment`, `currentView`
- `clarifyText`, `condenseText`, `expandText`, `toneText` (lazy-cached AI results)

## Supported Languages (24)

English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Turkish, Polish, Dutch, Ukrainian, Swedish, Hebrew, Thai, Vietnamese, Indonesian, Filipino, Romanian, Czech
