import 'dotenv/config';

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const config = {
  server: {
    port: parseInt(optional('PORT', '3000'), 10),
  },
  azure: {
    endpoint: required('AZURE_OPENAI_ENDPOINT'),
    deployment: required('AZURE_OPENAI_DEPLOYMENT'),
    apiVersion: required('AZURE_OPENAI_API_VERSION'),
    apiKey: required('AZURE_OPENAI_API_KEY'),
  },
  speech: {
    key: required('AZURE_SPEECH_KEY'),
    region: required('AZURE_SPEECH_REGION'),
  },
  elevenlabs: {
    apiKey: required('ELEVENLABS_API_KEY'),
    defaultVoiceId: optional('ELEVENLABS_DEFAULT_VOICE', 'pNInz6obpgDQGcFmaJgB'),
  },
  mongodb: {
    uri: required('MONGODB_URI'),
  },
  translation: {
    contextWindowSize: 16,
    expandedContextSize: 24,
    confidenceThreshold: 0.7,
  },
} as const;
