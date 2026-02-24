// Room page: Socket.IO client, Azure Speech SDK, audio playback, message rendering

// ── Azure Speech language code mapping (BCP-47) ──
const AZURE_LANG_MAP = {
  en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
  pt: 'pt-BR', ru: 'ru-RU', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
  ar: 'ar-SA', hi: 'hi-IN', tr: 'tr-TR', pl: 'pl-PL', nl: 'nl-NL',
  uk: 'uk-UA', sv: 'sv-SE', he: 'he-IL', th: 'th-TH', vi: 'vi-VN',
  id: 'id-ID', fil: 'fil-PH', ro: 'ro-RO', cs: 'cs-CZ', sk: 'sk-SK',
  gu: 'gu-IN',
};

const DIALECT_OVERRIDES = {
  'en-British': 'en-GB', 'en-Australian': 'en-AU',
  'es-Latin American': 'es-MX', 'fr-Canadian': 'fr-CA',
  'pt-European': 'pt-PT', 'zh-Traditional': 'zh-TW',
  'ar-Egyptian': 'ar-EG', 'ar-Levantine': 'ar-SY', 'ar-Gulf': 'ar-AE',
  'de-Austrian': 'de-AT', 'de-Swiss': 'de-CH',
};

// ── State ──
const roomCode = window.location.pathname.split('/').pop();
let userId = null;
let language = null;
let dialect = null;
let recognizer = null;
let isMicActive = false;
let audioContext = null;

// ── DOM refs ──
const chatArea = document.getElementById('chat-area');
const waitingScreen = document.getElementById('waiting-screen');
const inputBar = document.getElementById('input-bar');
const typingIndicator = document.getElementById('typing-indicator');
const roomCodeDisplay = document.getElementById('room-code-display');
const waitingCodeEl = document.getElementById('waiting-code');
const partnerInfoEl = document.getElementById('partner-info');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const endBtn = document.getElementById('end-btn');

roomCodeDisplay.textContent = roomCode;
waitingCodeEl.textContent = roomCode;

// Track message elements by messageId
const messageElements = new Map();

// ── Audio unlock: ensure autoplay works after any user gesture ──
let audioUnlocked = false;
let pendingAudioQueue = []; // { messageId, base64Audio } waiting for unlock

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      audioUnlocked = true;
      flushAudioQueue();
    });
  } else {
    audioUnlocked = true;
    flushAudioQueue();
  }
}

function flushAudioQueue() {
  // pendingAudioQueue is no longer used — global queue handles everything.
  // Just kick the drain in case items were waiting for unlock.
  const prompt = document.getElementById('audio-unlock-prompt');
  if (prompt) prompt.style.display = 'none';
  drainAudioQueue();
}

// Unlock on any click or keypress anywhere on the page
document.addEventListener('click', unlockAudio);
document.addEventListener('keydown', unlockAudio);
document.addEventListener('touchstart', unlockAudio);

// ── Init: load profile from cookie ──
async function initRoom() {
  try {
    const res = await fetch('/voice/api/me');
    const data = await res.json();

    if (!data.exists || !data.userId) {
      window.location.href = '/voice/';
      return;
    }

    userId = data.userId;
    language = data.language;
    dialect = data.dialect;

    // Connect socket
    connectSocket();
  } catch (err) {
    console.error('Failed to load profile:', err);
    window.location.href = '/voice/';
  }
}

// ── Socket.IO ──
function connectSocket() {
  const socket = io({ path: '/voice/socket.io' });
  window._socket = socket; // Expose for event handlers

  socket.emit('join_room', { roomCode, userId });

  socket.on('room_joined', (data) => {
    if (data.partnerName) {
      partnerInfoEl.textContent = `${data.partnerName} (${data.partnerLanguage})`;
    }
    if (data.status === 'active') {
      activateChat(socket);
    }
  });

  socket.on('partner_joined', (data) => {
    partnerInfoEl.textContent = `${data.partnerName} (${data.partnerLanguage})`;
  });

  socket.on('room_active', () => {
    activateChat(socket);
  });

  socket.on('partner_typing', (data) => {
    if (data.isSpeaking) {
      typingIndicator.style.display = '';
      typingIndicator.textContent = data.partialText
        ? `Partner is saying: "${data.partialText}"`
        : 'Partner is speaking...';
    } else if (data.isTyping) {
      typingIndicator.style.display = '';
      typingIndicator.textContent = 'Partner is typing...';
    } else {
      typingIndicator.style.display = 'none';
    }
  });

  socket.on('translation_chunk', (data) => {
    typingIndicator.style.display = 'none';
    upsertReceivedMessage(data.messageId, data.partial, false);
  });

  socket.on('translation_complete', (data) => {
    typingIndicator.style.display = 'none';
    upsertReceivedMessage(data.messageId, data.translated, true, data);
  });

  socket.on('message_sent', (data) => {
    const el = messageElements.get(data.messageId);
    if (el) {
      el.dataset.dbId = data.dbMessageId;
      // If AI corrected the speech recognition, update the sender's own message
      if (data.corrected) {
        const msgText = el.querySelector('.msg-text');
        if (msgText) {
          msgText.innerHTML = escapeHtml(data.corrected) +
            '<span style="display:block;font-size:0.75em;opacity:0.6;margin-top:2px;text-decoration:line-through;">' +
            escapeHtml(data.original) + '</span>';
        }
      }
    }
  });

  socket.on('audio_ready', (data) => {
    playAudio(data.messageId, data.audio);
  });

  socket.on('audio_chunk', (data) => {
    queueAudioChunk(data.messageId, data.index, data.total, data.audio);
  });

  socket.on('room_ended', () => {
    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync();
      recognizer = null;
    }
    // Redirect both users to home after a brief delay
    setTimeout(() => { window.location.href = '/voice/'; }, 1500);
  });

  socket.on('partner_disconnected', () => {
    addSystemMessage('Partner disconnected.');
  });

  socket.on('error_msg', (data) => {
    alert(`Error: ${data.message}`);
    if (data.code === 'ROOM_NOT_FOUND' || data.code === 'ROOM_FULL' || data.code === 'NO_PROFILE') {
      window.location.href = '/voice/';
    }
  });

  // ── Text Input ──
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage(socket);
    }
  });

  sendBtn.addEventListener('click', () => sendTextMessage(socket));

  let typingTimeout = null;
  textInput.addEventListener('input', () => {
    socket.emit('typing', { roomCode, userId, isTyping: true });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit('typing', { roomCode, userId, isTyping: false });
    }, 1500);
  });

  // ── Mic / Speech Recognition ──
  micBtn.addEventListener('click', async () => {
    unlockAudio();

    if (isMicActive) {
      stopRecognition();
    } else {
      await startRecognition(socket);
    }
  });

  // ── End Call ──
  endBtn.addEventListener('click', () => {
    if (confirm('End this conversation?')) {
      socket.emit('end_room', { roomCode, userId });
    }
  });
}

// ── Chat Functions ──

function showChat() {
  waitingScreen.style.display = 'none';
  chatArea.style.display = 'flex';
  inputBar.style.display = 'flex';
}

let chatActivated = false;

function activateChat(socket) {
  if (chatActivated) return;
  chatActivated = true;
  showChat();
  unlockAudio();
  addSystemMessage('Chat started! Microphone is on.');
  // Auto-start speech recognition
  if (!isMicActive) {
    startRecognition(socket);
  }
}

function addSystemMessage(text) {
  const el = document.createElement('div');
  el.className = 'system-msg';
  el.textContent = text;
  chatArea.appendChild(el);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ── Growing sent message: speech chunks merge into one bubble ──
let currentSpeakingEl = null;

function addSentMessage(messageId, text) {
  const el = document.createElement('div');
  el.className = 'message sent';
  el.innerHTML = `<div class="msg-text">${escapeHtml(text)}</div>`;
  el.dataset.messageId = messageId;
  chatArea.appendChild(el);
  messageElements.set(messageId, el);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Append text to the current speaking bubble (or create one)
function appendSentChunk(messageId, text) {
  if (!currentSpeakingEl) {
    currentSpeakingEl = document.createElement('div');
    currentSpeakingEl.className = 'message sent';
    currentSpeakingEl.innerHTML = `<div class="msg-text"></div>`;
    chatArea.appendChild(currentSpeakingEl);
  }
  // Track each chunk's messageId so server corrections can find it
  messageElements.set(messageId, currentSpeakingEl);

  const msgText = currentSpeakingEl.querySelector('.msg-text');
  if (msgText.textContent) {
    msgText.textContent += ' ' + text;
  } else {
    msgText.textContent = text;
  }
  chatArea.scrollTop = chatArea.scrollHeight;
}

function finalizeSentMessage() {
  currentSpeakingEl = null;
}

function upsertReceivedMessage(messageId, text, isFinal, fullData) {
  let el = messageElements.get(messageId);
  if (!el) {
    el = document.createElement('div');
    el.className = 'message received';
    el.dataset.messageId = messageId;
    chatArea.appendChild(el);
    messageElements.set(messageId, el);
  }

  let html = `<div class="msg-text">${escapeHtml(text)}</div>`;

  if (isFinal && fullData) {
    el.dataset.dbId = fullData.dbMessageId;
    el.dataset.original = fullData.original;
    el.dataset.literal = fullData.literal;

    html += `
      <div class="msg-meta">
        <span>${fullData.sentiment || ''}</span>
      </div>
      <div class="msg-actions">
        <button onclick="showOriginal('${messageId}')">Original</button>
        <button onclick="showLiteral('${messageId}')">Literal</button>
        <button onclick="fetchAI('${fullData.dbMessageId}', 'clarify', '${messageId}')">Clarify</button>
        <button onclick="fetchAI('${fullData.dbMessageId}', 'condense', '${messageId}')">Condense</button>
        <button onclick="fetchAI('${fullData.dbMessageId}', 'expand', '${messageId}')">Expand</button>
        <button onclick="fetchAI('${fullData.dbMessageId}', 'tone', '${messageId}')">Tone</button>
      </div>
      <div class="audio-indicator" id="audio-${messageId}" style="display:none">
        <span>&#128264;</span> <span>Play audio</span>
      </div>
    `;
  }

  el.innerHTML = html;
  chatArea.scrollTop = chatArea.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── Message Actions ──

window.showOriginal = function(messageId) {
  const el = messageElements.get(messageId);
  if (!el) return;
  const existing = el.querySelector('.ai-result');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'ai-result';
  div.textContent = el.dataset.original || '';
  el.appendChild(div);
};

window.showLiteral = function(messageId) {
  const el = messageElements.get(messageId);
  if (!el) return;
  const existing = el.querySelector('.ai-result');
  if (existing) existing.remove();
  const div = document.createElement('div');
  div.className = 'ai-result';
  div.textContent = el.dataset.literal || '';
  el.appendChild(div);
};

window.fetchAI = async function(dbMessageId, type, messageId) {
  const el = messageElements.get(messageId);
  if (!el) return;

  const existing = el.querySelector('.ai-result');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.className = 'ai-result';
  div.textContent = 'Loading...';
  el.appendChild(div);

  try {
    const res = await fetch(`/voice/api/messages/${dbMessageId}/${type}`);
    const data = await res.json();
    div.textContent = data.text || 'No result.';
  } catch (err) {
    div.textContent = 'Failed to load.';
  }
};

// ── Audio Playback — Global sequential queue ──
// All audio (single clips, chunks from different messages) goes through ONE queue
// so nothing overlaps. Items play one after another in arrival order.

const globalAudioQueue = []; // [{ messageId, base64Audio }]
let isPlayingAudio = false;

function showAudioUnlockPrompt() {
  if (document.getElementById('audio-unlock-prompt')) return;
  const prompt = document.createElement('div');
  prompt.id = 'audio-unlock-prompt';
  prompt.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);background:#6c63ff;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;z-index:999;animation:pulse 1.5s infinite;';
  prompt.textContent = 'Tap here to enable audio playback';
  prompt.addEventListener('click', () => {
    unlockAudio();
    prompt.remove();
  });
  document.body.appendChild(prompt);
}

// Enqueue audio and start playing if idle
function enqueueAudio(messageId, base64Audio) {
  // Show play indicator on the message
  const indicator = document.getElementById(`audio-${messageId}`);
  if (indicator) {
    indicator.style.display = 'inline-flex';
    indicator.onclick = () => playOneClip(base64Audio, () => {});
  }

  globalAudioQueue.push({ messageId, base64Audio });
  drainAudioQueue();
}

function drainAudioQueue() {
  if (isPlayingAudio) return;
  if (globalAudioQueue.length === 0) return;

  if (!audioUnlocked) {
    showAudioUnlockPrompt();
    return;
  }

  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') {
    showAudioUnlockPrompt();
    return;
  }

  isPlayingAudio = true;
  const { base64Audio } = globalAudioQueue.shift();

  playOneClip(base64Audio, () => {
    isPlayingAudio = false;
    drainAudioQueue();
  });
}

function playOneClip(base64Audio, onDone) {
  const ctx = ensureAudioContext();
  try {
    const binaryStr = atob(base64Audio);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    ctx.decodeAudioData(bytes.buffer.slice(0), (audioBuffer) => {
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = onDone;
      source.start(0);
    }, () => {
      // Fallback: Audio element
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); onDone(); };
      audio.onerror = () => { URL.revokeObjectURL(url); onDone(); };
      audio.play().catch(() => { URL.revokeObjectURL(url); onDone(); });
    });
  } catch (err) {
    console.error('Audio playback error:', err);
    onDone();
  }
}

// Called by audio_ready (single full clip)
function playAudio(messageId, base64Audio) {
  enqueueAudio(messageId, base64Audio);
}

// Called by audio_chunk (sentence chunks — queue each in order)
function queueAudioChunk(messageId, index, total, base64Audio) {
  enqueueAudio(messageId, base64Audio);
}

// ── Text Send ──

function sendTextMessage(socket) {
  const text = textInput.value.trim();
  if (!text) return;

  const messageId = crypto.randomUUID();
  addSentMessage(messageId, text);
  socket.emit('send_text', { roomCode, userId, text });
  textInput.value = '';
  socket.emit('typing', { roomCode, userId, isTyping: false });
}

// ── Speech Recognition ──

async function startRecognition(socket) {
  try {
    const res = await fetch('/voice/api/speech-token');
    const { token, region } = await res.json();

    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);

    // Disable profanity filter so STT returns raw uncensored text
    speechConfig.setProfanity(SpeechSDK.ProfanityOption.Raw);

    // Shorter silence timeout so Azure finalizes speech faster (default ~2-3s)
    speechConfig.setProperty('Speech_SegmentationSilenceTimeoutMs', '1500');

    const dialectKey = `${language}-${dialect}`;
    speechConfig.speechRecognitionLanguage =
      DIALECT_OVERRIDES[dialectKey] || AZURE_LANG_MAP[language] || 'en-US';

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    // Track how much of the current utterance we've already sent for translation.
    // Azure's recognizing event gives the FULL partial each time (not deltas),
    // so we track the offset to know what's new.
    let sentLength = 0;
    let lastSendTime = 0; // 0 = not started; set on first recognizing event
    const FORCE_SEND_MS = 6000; // force-send after 6s of continuous speech
    const MIN_CHARS_TO_SEND = 15; // don't send tiny fragments
    // Sentence-ending punctuation (incl. CJK fullwidth)
    const sentenceEndRe = /[.!?\u3002\uFF01\uFF1F]/;

    recognizer.recognizing = (_s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
        const fullPartial = e.result.text;
        const newText = fullPartial.substring(sentLength);
        const now = Date.now();

        // Start timer from first recognizing event of this utterance
        if (lastSendTime === 0) lastSendTime = now;

        // 1. Check for sentence-ending punctuation in the new portion
        let lastBoundary = -1;
        for (let i = 0; i < newText.length; i++) {
          if (sentenceEndRe.test(newText[i])) lastBoundary = i;
        }

        if (lastBoundary >= 0) {
          // Punctuation found — send up to the boundary
          const sentence = newText.substring(0, lastBoundary + 1).trim();
          if (sentence.length > 0) {
            const messageId = crypto.randomUUID();
            appendSentChunk(messageId, sentence);
            socket.emit('phrase_recognized', {
              roomCode, userId,
              text: sentence,
              isFinal: true,
            });
          }
          sentLength += lastBoundary + 1;
          lastSendTime = now;

          const remainder = fullPartial.substring(sentLength).trim();
          if (remainder.length > 0) {
            socket.emit('phrase_recognized', {
              roomCode, userId,
              text: remainder,
              isFinal: false,
            });
          }
        } else if (now - lastSendTime >= FORCE_SEND_MS && newText.trim().length >= MIN_CHARS_TO_SEND) {
          // 2. Time threshold — force-send what we have so far
          const chunk = newText.trim();
          const messageId = crypto.randomUUID();
          appendSentChunk(messageId, chunk);
          socket.emit('phrase_recognized', {
            roomCode, userId,
            text: chunk,
            isFinal: true,
          });
          sentLength = fullPartial.length;
          lastSendTime = now;
        } else {
          // 3. Just show typing indicator
          socket.emit('phrase_recognized', {
            roomCode, userId,
            text: fullPartial,
            isFinal: false,
          });
        }
      }
    };

    recognizer.recognized = (_s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text) {
        // Azure finalized this segment — send whatever wasn't already sent
        const fullText = e.result.text;
        const remaining = fullText.substring(sentLength).trim();
        sentLength = 0; // reset for next utterance
        lastSendTime = 0; // reset timer for next utterance

        if (remaining.length > 0) {
          const messageId = crypto.randomUUID();
          appendSentChunk(messageId, remaining);
          socket.emit('phrase_recognized', {
            roomCode, userId,
            text: remaining,
            isFinal: true,
          });
        }
        // Finalize the current speaking bubble — next speech starts a new one
        finalizeSentMessage();
      }
    };

    recognizer.canceled = (_s, e) => {
      console.error('Speech recognition canceled:', e.errorDetails);
      stopRecognition();
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        isMicActive = true;
        micBtn.classList.add('active');
        micBtn.innerHTML = '&#9632;';
      },
      (err) => {
        console.error('Failed to start recognition:', err);
      }
    );

    // Refresh token before expiry (9.5 min)
    setTimeout(async () => {
      if (recognizer) {
        try {
          const r = await fetch('/voice/api/speech-token');
          const d = await r.json();
          recognizer.authorizationToken = d.token;
        } catch (e) {
          console.error('Token refresh failed:', e);
        }
      }
    }, 9.5 * 60 * 1000);
  } catch (err) {
    console.error('Speech recognition setup failed:', err);
    alert('Failed to start speech recognition. Check microphone permissions.');
  }
}

function stopRecognition() {
  if (recognizer) {
    recognizer.stopContinuousRecognitionAsync(
      () => {
        isMicActive = false;
        micBtn.classList.remove('active');
        micBtn.innerHTML = '&#127908;';
      },
      (err) => console.error('Stop recognition error:', err)
    );
  }
}

// ── Start ──
initRoom();
