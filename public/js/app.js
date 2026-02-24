// ── Language data ──

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '\u{1F1FA}\u{1F1F8}', dialects: ['American', 'British', 'Australian'] },
  { code: 'es', name: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}', dialects: ['Latin American', 'Castilian'] },
  { code: 'fr', name: 'French', flag: '\u{1F1EB}\u{1F1F7}', dialects: ['Metropolitan', 'Canadian', 'African'] },
  { code: 'de', name: 'German', flag: '\u{1F1E9}\u{1F1EA}', dialects: ['Standard', 'Austrian', 'Swiss'] },
  { code: 'it', name: 'Italian', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'pt', name: 'Portuguese', flag: '\u{1F1E7}\u{1F1F7}', dialects: ['Brazilian', 'European'] },
  { code: 'ru', name: 'Russian', flag: '\u{1F1F7}\u{1F1FA}' },
  { code: 'zh', name: 'Chinese', flag: '\u{1F1E8}\u{1F1F3}', dialects: ['Simplified', 'Traditional'] },
  { code: 'ja', name: 'Japanese', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'ko', name: 'Korean', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'ar', name: 'Arabic', flag: '\u{1F1F8}\u{1F1E6}', dialects: ['Modern Standard', 'Egyptian', 'Levantine', 'Gulf'] },
  { code: 'hi', name: 'Hindi', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'tr', name: 'Turkish', flag: '\u{1F1F9}\u{1F1F7}' },
  { code: 'pl', name: 'Polish', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'nl', name: 'Dutch', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'uk', name: 'Ukrainian', flag: '\u{1F1FA}\u{1F1E6}' },
  { code: 'sv', name: 'Swedish', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'he', name: 'Hebrew', flag: '\u{1F1EE}\u{1F1F1}' },
  { code: 'th', name: 'Thai', flag: '\u{1F1F9}\u{1F1ED}' },
  { code: 'vi', name: 'Vietnamese', flag: '\u{1F1FB}\u{1F1F3}' },
  { code: 'id', name: 'Indonesian', flag: '\u{1F1EE}\u{1F1E9}' },
  { code: 'fil', name: 'Filipino', flag: '\u{1F1F5}\u{1F1ED}' },
  { code: 'ro', name: 'Romanian', flag: '\u{1F1F7}\u{1F1F4}' },
  { code: 'cs', name: 'Czech', flag: '\u{1F1E8}\u{1F1FF}' },
  { code: 'sk', name: 'Slovak', flag: '\u{1F1F8}\u{1F1F0}' },
  { code: 'gu', name: 'Gujarati', flag: '\u{1F1EE}\u{1F1F3}' },
];

// ── Voice recording scripts by language ──

const VOICE_SCRIPTS = {
  en: `Hello! My name is... and I'm recording this voice sample for the translator. I'll try to speak naturally and clearly.

Let me tell you about my day. This morning I woke up feeling great. The weather was beautiful, and I decided to take a walk outside. I love how the fresh air makes everything feel so alive.

Now I'll try some different emotions. I'm SO excited about this! Can you believe it? That's absolutely wonderful news!

Hmm, I'm not so sure about that... Well, actually, let me think. You know what? That's a really good question. I'd have to say it depends on the situation.

One, two, three, four, five. The quick brown fox jumps over the lazy dog. She sells seashells by the seashore.`,

  es: `Hola, mi nombre es... y estoy grabando esta muestra de voz para el traductor. Voy a intentar hablar de forma natural y clara.

Déjame contarte sobre mi dia. Esta manana me desperte sintiendome muy bien. El clima estaba hermoso y decidi salir a caminar. Me encanta como el aire fresco hace que todo se sienta tan vivo.

Ahora voy a probar diferentes emociones. Estoy MUY emocionado por esto! Puedes creerlo? Esa es una noticia absolutamente maravillosa!

Hmm, no estoy tan seguro de eso... Bueno, en realidad, dejame pensar. Sabes que? Esa es una muy buena pregunta. Diria que depende de la situacion.

Uno, dos, tres, cuatro, cinco. El veloz murcielago hindu comia feliz cardillo y kiwi.`,

  fr: `Bonjour, je m'appelle... et j'enregistre cet echantillon vocal pour le traducteur. Je vais essayer de parler naturellement et clairement.

Laissez-moi vous raconter ma journee. Ce matin, je me suis reveille en pleine forme. Le temps etait magnifique et j'ai decide de faire une promenade. J'adore comment l'air frais rend tout si vivant.

Maintenant, je vais essayer differentes emotions. Je suis TELLEMENT enthousiaste! Vous pouvez le croire? C'est une nouvelle absolument merveilleuse!

Hmm, je ne suis pas si sur de ca... Eh bien, en fait, laissez-moi reflechir. Vous savez quoi? C'est une tres bonne question.

Un, deux, trois, quatre, cinq. Les chaussettes de l'archiduchesse sont-elles seches ou archi-seches?`,

  de: `Hallo, mein Name ist... und ich nehme diese Stimmprobe fur den Ubersetzer auf. Ich werde versuchen, naturlich und deutlich zu sprechen.

Lassen Sie mich von meinem Tag erzahlen. Heute Morgen bin ich gut gelaunt aufgewacht. Das Wetter war wunderschon und ich habe mich fur einen Spaziergang entschieden.

Jetzt probiere ich verschiedene Emotionen. Ich bin SO begeistert davon! Konnen Sie das glauben? Das sind absolut wunderbare Neuigkeiten!

Hmm, da bin ich mir nicht so sicher... Nun, eigentlich, lassen Sie mich nachdenken. Wissen Sie was? Das ist eine wirklich gute Frage.

Eins, zwei, drei, vier, funf. Fischers Fritz fischt frische Fische.`,

  pt: `Ola, meu nome e... e estou gravando esta amostra de voz para o tradutor. Vou tentar falar de forma natural e clara.

Deixe-me contar sobre meu dia. Esta manha acordei me sentindo muito bem. O tempo estava lindo e decidi fazer uma caminhada.

Agora vou tentar diferentes emocoes. Estou MUITO animado com isso! Voce pode acreditar? Essa e uma noticia absolutamente maravilhosa!

Hmm, nao tenho tanta certeza disso... Bom, na verdade, deixe-me pensar. Sabe o que? Essa e uma pergunta muito boa.

Um, dois, tres, quatro, cinco. O rato roeu a roupa do rei de Roma.`,

  zh: `你好，我叫...，我正在为翻译器录制这个语音样本。我会尽量自然清晰地说话。

让我告诉你关于我今天的事情。今天早上我醒来感觉很好。天气很美，我决定出去散步。我喜欢新鲜空气让一切感觉如此有活力。

现在我来试试不同的情绪。我太兴奋了！你能相信吗？这是绝对美妙的消息！

嗯，我不太确定...好吧，其实，让我想想。你知道吗？这是一个很好的问题。我得说这取决于情况。

一，二，三，四，五。四是四，十是十，十四是十四，四十是四十。`,

  ja: `こんにちは、私の名前は...です。翻訳のためにこの音声サンプルを録音しています。できるだけ自然にはっきりと話すようにします。

今日の一日について話させてください。今朝はとても気分良く目が覚めました。天気がとても良くて、散歩に出かけることにしました。

では、いろいろな感情を試してみます。これにはとてもワクワクしています！信じられますか？本当に素晴らしいニュースですね！

うーん、それはちょっとわかりませんね...まあ、実は、考えさせてください。あのね、それは本当に良い質問ですね。

一、二、三、四、五。生麦生米生卵。隣の客はよく柿食う客だ。`,

  ko: `안녕하세요, 제 이름은...이고, 번역기를 위해 이 음성 샘플을 녹음하고 있습니다. 자연스럽고 명확하게 말하도록 노력하겠습니다.

오늘 하루에 대해 이야기해 드리겠습니다. 오늘 아침에 기분 좋게 일어났습니다. 날씨가 아름다워서 산책을 하기로 했습니다.

이제 다른 감정을 시도해 보겠습니다. 정말 신나요! 믿을 수 있나요? 정말 놀라운 소식이에요!

음, 그건 잘 모르겠는데요... 사실, 생각해 보겠습니다. 그거 아세요? 정말 좋은 질문이네요.

하나, 둘, 셋, 넷, 다섯. 간장 공장 공장장은 강 공장장이고 된장 공장 공장장은 장 공장장이다.`,

  ar: `مرحبا، اسمي... وأنا أسجل هذه العينة الصوتية للمترجم. سأحاول أن أتحدث بشكل طبيعي وواضح.

دعني أخبرك عن يومي. هذا الصباح استيقظت وأنا أشعر بحالة رائعة. كان الطقس جميلا وقررت أن أخرج للمشي.

الآن سأجرب مشاعر مختلفة. أنا متحمس جدا لهذا! هل يمكنك تصديق ذلك؟ هذا خبر رائع حقا!

همم، لست متأكدا من ذلك... حسنا، في الواقع، دعني أفكر. أتعرف ماذا؟ هذا سؤال جيد حقا.

واحد، اثنان، ثلاثة، أربعة، خمسة.`,

  ru: `Привет, меня зовут... и я записываю этот образец голоса для переводчика. Я постараюсь говорить естественно и четко.

Позвольте мне рассказать о своем дне. Сегодня утром я проснулся в отличном настроении. Погода была прекрасная, и я решил прогуляться.

Теперь попробую разные эмоции. Я ТАК взволнован этим! Вы можете в это поверить? Это абсолютно замечательные новости!

Хмм, я не совсем уверен в этом... Ну, на самом деле, дайте подумать. Знаете что? Это действительно хороший вопрос.

Один, два, три, четыре, пять. Шла Саша по шоссе и сосала сушку.`,

  gu: `નમસ્તે, મારું નામ છે... અને હું આ અનુવાદક માટે અવાજનો નમૂનો રેકોર્ડ કરી રહ્યો છું. હું કુદરતી અને સ્પષ્ટ રીતે બોલવાનો પ્રયત્ન કરીશ.

મને મારા દિવસ વિશે કહેવા દો. આજે સવારે હું ખૂબ સારું અનુભવતો જાગ્યો. હવામાન સુંદર હતું અને મેં ચાલવા જવાનું નક્કી કર્યું. મને ગમે છે કે તાજી હવા બધું કેટલું જીવંત બનાવે છે.

હવે હું જુદી જુદી લાગણીઓ અજમાવીશ. હું આનાથી ખૂબ જ ઉત્સાહિત છું! તમે માની શકો? આ ખરેખર અદ્ભુત સમાચાર છે!

હમ્મ, મને એની ખાતરી નથી... સારું, ખરેખર, મને વિચારવા દો. તમે જાણો છો શું? આ ખરેખર સારો પ્રશ્ન છે.

એક, બે, ત્રણ, ચાર, પાંચ. કાચા કાચના કાચના ગ્લાસ.`,

  id: `Halo, nama saya... dan saya sedang merekam sampel suara ini untuk penerjemah. Saya akan mencoba berbicara secara alami dan jelas.

Biar saya ceritakan tentang hari saya. Pagi ini saya bangun dengan perasaan yang sangat baik. Cuacanya indah dan saya memutuskan untuk jalan-jalan. Saya suka bagaimana udara segar membuat semuanya terasa begitu hidup.

Sekarang saya akan mencoba emosi yang berbeda. Saya SANGAT bersemangat tentang ini! Bisa dipercaya nggak? Ini berita yang benar-benar luar biasa!

Hmm, saya kurang yakin soal itu... Yah, sebenarnya, biar saya pikir dulu. Tahu nggak? Itu pertanyaan yang bagus banget. Saya harus bilang itu tergantung situasinya.

Satu, dua, tiga, empat, lima. Ular melingkar di atas pagar, pagar miring ular pun miring.`,
};

// ── State ──

let currentProfile = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let isRerecording = false;

// ── Helpers ──

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function getLangName(code) {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang ? `${lang.flag} ${lang.name}` : code;
}

function populateLanguageSelect(selectEl, dialectGroupEl, dialectSelectEl) {
  selectEl.innerHTML = '<option value="">Select language...</option>';
  for (const lang of LANGUAGES) {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = `${lang.flag} ${lang.name}`;
    selectEl.appendChild(opt);
  }

  selectEl.addEventListener('change', () => {
    const lang = LANGUAGES.find(l => l.code === selectEl.value);
    if (lang?.dialects) {
      dialectGroupEl.style.display = '';
      dialectSelectEl.innerHTML = '<option value="">Default</option>';
      for (const d of lang.dialects) {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        dialectSelectEl.appendChild(opt);
      }
    } else {
      dialectGroupEl.style.display = 'none';
      dialectSelectEl.innerHTML = '';
    }
  });
}

// ── Startup ──

async function init() {
  // Populate language selects
  populateLanguageSelect(
    document.getElementById('onboard-lang'),
    document.getElementById('onboard-dialect-group'),
    document.getElementById('onboard-dialect')
  );

  // Check for existing profile
  try {
    const res = await fetch('/voice/api/me');
    const data = await res.json();

    if (data.exists) {
      currentProfile = data;
      if (!data.voiceId) {
        showVoiceScreen();
      } else {
        showHomeScreen();
      }
      return;
    }
  } catch (err) {
    console.error('Failed to check profile:', err);
  }

  showScreen('onboarding-screen');
}

// ── Onboarding ──

document.getElementById('onboarding-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('onboard-btn');
  const errorEl = document.getElementById('onboard-error');
  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const body = {
      displayName: document.getElementById('onboard-name').value.trim(),
      language: document.getElementById('onboard-lang').value,
      dialect: document.getElementById('onboard-dialect').value || undefined,
    };

    const res = await fetch('/voice/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save profile');
    }

    currentProfile = await res.json();
    showVoiceScreen();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = '';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Continue';
  }
});

// ── Voice Recording Screen ──

function showVoiceScreen() {
  showScreen('voice-screen');
  document.getElementById('voice-card-main').style.display = '';
  document.getElementById('voice-processing').classList.remove('active');

  // Load script for user's language
  const lang = currentProfile?.language || 'en';
  const nativeScript = VOICE_SCRIPTS[lang] || VOICE_SCRIPTS['en'];
  const englishScript = VOICE_SCRIPTS['en'];
  document.getElementById('script-text').textContent = nativeScript;

  // Script language toggle
  const toggleBtn = document.getElementById('script-toggle-btn');
  const scriptNote = document.getElementById('script-note');
  let showingEnglish = false;

  // Hide toggle if already English
  if (lang === 'en') {
    toggleBtn.style.display = 'none';
  } else {
    toggleBtn.style.display = '';
  }
  scriptNote.style.display = 'none';

  toggleBtn.onclick = () => {
    showingEnglish = !showingEnglish;
    if (showingEnglish) {
      document.getElementById('script-text').textContent = englishScript;
      toggleBtn.textContent = 'Show in my language';
      scriptNote.style.display = '';
    } else {
      document.getElementById('script-text').textContent = nativeScript;
      toggleBtn.textContent = 'Show in English';
      scriptNote.style.display = 'none';
    }
  };

  // Reset state
  recordedChunks = [];
  recordingSeconds = 0;
  updateTimerDisplay();
  document.getElementById('voice-progress-fill').style.width = '0%';
  document.getElementById('recording-status').textContent = 'Press the button to start recording';
  document.getElementById('upload-voice-btn').disabled = true;
  document.getElementById('record-btn').classList.remove('recording');
  document.getElementById('voice-error').style.display = 'none';
}

function updateTimerDisplay() {
  const mins = Math.floor(recordingSeconds / 60);
  const secs = recordingSeconds % 60;
  document.getElementById('recording-timer').textContent =
    `${mins}:${secs.toString().padStart(2, '0')} / 1:00`;
}

document.getElementById('record-btn').addEventListener('click', async () => {
  const btn = document.getElementById('record-btn');

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    // Stop recording
    mediaRecorder.stop();
    btn.classList.remove('recording');
    clearInterval(recordingTimer);
    document.getElementById('recording-status').textContent = 'Recording complete! Press "Use Recording" to continue.';
    return;
  }

  // Start recording
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    recordingSeconds = 0;
    updateTimerDisplay();

    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (recordedChunks.length > 0) {
        document.getElementById('upload-voice-btn').disabled = false;
      }
    };

    mediaRecorder.start(1000); // collect chunks every second
    btn.classList.add('recording');
    document.getElementById('recording-status').textContent = 'Recording... read the script above';
    document.getElementById('upload-voice-btn').disabled = true;

    recordingTimer = setInterval(() => {
      recordingSeconds++;
      updateTimerDisplay();
      const pct = Math.min((recordingSeconds / 60) * 100, 100);
      document.getElementById('voice-progress-fill').style.width = `${pct}%`;

      if (recordingSeconds >= 60) {
        mediaRecorder.stop();
        btn.classList.remove('recording');
        clearInterval(recordingTimer);
        document.getElementById('recording-status').textContent = 'Recording complete! Press "Use Recording" to continue.';
      }
    }, 1000);
  } catch (err) {
    console.error('Mic error:', err);
    document.getElementById('recording-status').textContent = 'Microphone access denied. Please allow microphone access.';
  }
});

document.getElementById('upload-voice-btn').addEventListener('click', async () => {
  if (recordedChunks.length === 0) return;

  const errorEl = document.getElementById('voice-error');
  errorEl.style.display = 'none';

  // Show processing overlay
  document.getElementById('voice-card-main').style.display = 'none';
  document.getElementById('voice-processing').classList.add('active');

  try {
    const blob = new Blob(recordedChunks, { type: 'audio/webm;codecs=opus' });
    const endpoint = isRerecording ? '/voice/api/voice/rerecord' : '/voice/api/voice';

    const res = await fetch(endpoint, {
      method: 'POST',
      body: blob,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to clone voice');
    }

    const result = await res.json();
    currentProfile.voiceId = result.voiceId;
    isRerecording = false;
    showHomeScreen();
  } catch (err) {
    // Show card again with error
    document.getElementById('voice-card-main').style.display = '';
    document.getElementById('voice-processing').classList.remove('active');
    errorEl.textContent = err.message;
    errorEl.style.display = '';
  }
});

document.getElementById('skip-voice-btn').addEventListener('click', () => {
  // Skip voice cloning, go straight to home
  showHomeScreen();
});

// ── Home Screen ──

function showHomeScreen() {
  showScreen('home-screen');

  if (currentProfile) {
    document.getElementById('home-user-name').textContent = currentProfile.displayName;
    document.getElementById('home-user-lang').textContent = getLangName(currentProfile.language) +
      (currentProfile.dialect ? ` (${currentProfile.dialect})` : '') +
      (currentProfile.voiceId ? ' \u2022 Voice cloned' : ' \u2022 No voice clone');

    // Recent rooms
    const rooms = currentProfile.recentRooms || [];
    const recentEl = document.getElementById('recent-rooms');
    const listEl = document.getElementById('recent-rooms-list');
    if (rooms.length > 0) {
      recentEl.style.display = '';
      listEl.innerHTML = rooms.map(r => `
        <div class="recent-room-item">
          <span class="room-partner">${escapeHtml(r.partnerName)}</span>
          <span class="room-code-small">${r.roomCode}</span>
        </div>
      `).join('');
    } else {
      recentEl.style.display = 'none';
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Create room
document.getElementById('create-room-btn').addEventListener('click', async () => {
  const btn = document.getElementById('create-room-btn');
  const errorEl = document.getElementById('create-error');
  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    const res = await fetch('/voice/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create room');
    }

    const { roomCode } = await res.json();
    window.location.href = `/voice/room/${roomCode}`;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = '';
    btn.disabled = false;
    btn.textContent = 'Create Room';
  }
});

// Join room
document.getElementById('join-room-btn').addEventListener('click', async () => {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  if (!code) return;

  const btn = document.getElementById('join-room-btn');
  const errorEl = document.getElementById('join-error');
  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Joining...';

  try {
    const res = await fetch(`/voice/api/rooms/${code}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to join room');
    }

    const { roomCode } = await res.json();
    window.location.href = `/voice/room/${roomCode}`;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = '';
    btn.disabled = false;
    btn.textContent = 'Join';
  }
});

// Auto-uppercase room code
document.getElementById('join-code').addEventListener('input', (e) => {
  e.target.value = e.target.value.toUpperCase();
});

// Re-record voice
document.getElementById('rerecord-btn').addEventListener('click', () => {
  isRerecording = true;
  showVoiceScreen();
});

// Change profile
document.getElementById('change-profile-btn').addEventListener('click', () => {
  showScreen('onboarding-screen');
  // Pre-fill if we have profile data
  if (currentProfile) {
    document.getElementById('onboard-name').value = currentProfile.displayName;
    const langSelect = document.getElementById('onboard-lang');
    langSelect.value = currentProfile.language;
    langSelect.dispatchEvent(new Event('change'));
    if (currentProfile.dialect) {
      setTimeout(() => {
        document.getElementById('onboard-dialect').value = currentProfile.dialect;
      }, 50);
    }
  }
});

// ── Init ──
init();
