import { config } from '../config.js';

const BASE_URL = 'https://api.elevenlabs.io/v1';

export async function cloneVoice(name: string, audioBuffer: Buffer): Promise<string> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('files', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' }), 'voice_sample.webm');

  const response = await fetch(`${BASE_URL}/voices/add`, {
    method: 'POST',
    headers: {
      'xi-api-key': config.elevenlabs.apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Voice clone failed:', error);
    throw new Error(`Voice clone failed: ${response.status}`);
  }

  const data = await response.json() as { voice_id: string };
  return data.voice_id;
}

export async function deleteVoice(voiceId: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/voices/${voiceId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': config.elevenlabs.apiKey },
    });
    if (!response.ok) {
      console.warn(`deleteVoice failed (${response.status}), continuing anyway`);
    }
  } catch (err) {
    console.warn('deleteVoice error, continuing anyway:', err);
  }
}

export async function textToSpeech(voiceId: string, text: string, languageCode?: string): Promise<Buffer> {
  const body: Record<string, unknown> = {
    text,
    model_id: 'eleven_multilingual_v2',
    output_format: 'mp3_44100_128',
  };
  if (languageCode) {
    body.language_code = languageCode;
  }

  const response = await fetch(`${BASE_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': config.elevenlabs.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('TTS failed:', error);
    throw new Error(`TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
