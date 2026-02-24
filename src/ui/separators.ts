import { escapeHtml } from '../bot/helpers.js';
import { t } from './i18n.js';

export function chatStartedSeparator(lang?: string): string {
  return [
    '',
    `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 <b>${t(lang, 'sep_chat_started')}</b> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`,
    t(lang, 'sep_speak_natural'),
    t(lang, 'sep_type_end'),
    '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550',
    '',
  ].join('\n');
}

export function chatEndedSeparator(endTime: string, lang?: string): string {
  return [
    '',
    `\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 <b>${t(lang, 'sep_chat_ended')}</b> \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550`,
    t(lang, 'sep_ended_time', { time: endTime }),
    '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550',
    '',
  ].join('\n');
}

export function joiningSessionSeparator(lang?: string): string {
  return '\u2500\u2500\u2500\u2500\u2500\u2500 <b>Joining Session</b> \u2500\u2500\u2500\u2500\u2500\u2500';
}

export function nowConnectedMessage(partnerName: string, lang?: string): string {
  return t(lang, 'sep_connected_to', { name: escapeHtml(partnerName) }) +
    '\n\n' + t(lang, 'sep_type_naturally');
}
