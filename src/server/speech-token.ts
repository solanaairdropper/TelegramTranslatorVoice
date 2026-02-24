import { config } from '../config.js';

interface SpeechToken {
  token: string;
  region: string;
}

export async function getSpeechToken(): Promise<SpeechToken> {
  const url = `https://${config.speech.region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': config.speech.key,
      'Content-Length': '0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get speech token: ${response.status} ${response.statusText}`);
  }

  const token = await response.text();
  return { token, region: config.speech.region };
}
