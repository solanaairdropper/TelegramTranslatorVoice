import 'dotenv/config';

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

export const config = {
  telegram: {
    token: required('TELEGRAM_BOT_TOKEN'),
    botUsername: '', // populated at startup
  },
  azure: {
    endpoint: required('AZURE_OPENAI_ENDPOINT'),
    deployment: required('AZURE_OPENAI_DEPLOYMENT'),
    apiVersion: required('AZURE_OPENAI_API_VERSION'),
    apiKey: required('AZURE_OPENAI_API_KEY'),
  },
  mongodb: {
    uri: required('MONGODB_URI'),
  },
  translation: {
    contextWindowSize: 16,
    expandedContextSize: 24,
    confidenceThreshold: 0.7,
    revertTimeoutSeconds: 30,
  },
} as const;
