import { getLanguage } from '../utils/language-codes.js';
import { IUser } from '../db/models/user.js';
import { ISession } from '../db/models/session.js';
import { escapeHtml } from '../bot/helpers.js';
import { t } from './i18n.js';

// ── Setup phase card (building profile) ──

export function profileCardSetup(user: IUser): string {
  const handle = user.username ? `@${escapeHtml(user.username)}` : escapeHtml(user.firstName);
  const lang = user.language ? (getLanguage(user.language)?.name ?? user.language) : '\u2014';
  const dialect = user.dialect && user.dialect !== 'none' ? ` (${user.dialect})` : '';

  return [
    `\u{1F464} <b>${handle}</b>`,
    `\u{1F30D} ${lang}${dialect}`,
  ].join('\n');
}

// ── Unified home card (profile + status + menu in ONE message) ──

export interface HomeCardOptions {
  pendingSessions?: ISession[];
  activeSessions?: ISession[];
}

export function homeCard(user: IUser, opts?: HomeCardOptions): string {
  const handle = user.username ? `@${escapeHtml(user.username)}` : escapeHtml(user.firstName);
  const lang = user.language ? (getLanguage(user.language)?.name ?? user.language) : '?';
  const dialect = user.dialect && user.dialect !== 'none' ? ` (${user.dialect})` : '';
  const ul = user.language;

  const lines: string[] = [];

  // Profile section - compact
  lines.push(`\u{1F464} <b>${handle}</b>  \u00B7  ${lang}${dialect}`);
  lines.push('');

  // Status section
  const pending = opts?.pendingSessions ?? [];
  const active = opts?.activeSessions ?? [];

  if (active.length > 0) {
    for (const s of active) {
      const partnerName = s.creatorId === user.telegramId ? s.joinerName : s.creatorName;
      lines.push(t(ul, 'card_active_chat', { name: escapeHtml(partnerName ?? 'someone') }));
    }
  }

  if (pending.length > 0) {
    for (const s of pending) {
      lines.push(t(ul, 'card_waiting_code', { code: s.joinCode }));
    }
  }

  if (active.length === 0 && pending.length === 0) {
    lines.push(t(ul, 'card_no_chats'));
  }

  return lines.join('\n');
}

// ── Waiting for partner card (replaces home card while waiting) ──

export function waitingCard(user: IUser, session: ISession, inviteLink: string): string {
  const handle = user.username ? `@${escapeHtml(user.username)}` : escapeHtml(user.firstName);
  const lang = user.language ? (getLanguage(user.language)?.name ?? user.language) : '?';
  const dialect = user.dialect && user.dialect !== 'none' ? ` (${user.dialect})` : '';
  const ul = user.language;

  return [
    `\u{1F464} <b>${handle}</b>  \u00B7  ${lang}${dialect}`,
    '',
    t(ul, 'card_waiting_partner'),
    t(ul, 'card_code', { code: session.joinCode }),
    '',
    t(ul, 'card_share_link'),
    `<code>${inviteLink}</code>`,
  ].join('\n');
}

// ── Conversation card (during active chat) ──

export function conversationCard(user: IUser, partnerName: string, partnerLanguage: string, startTime: Date): string {
  const lang = user.language ? (getLanguage(user.language)?.name ?? user.language) : '?';
  const partnerLang = getLanguage(partnerLanguage)?.name ?? partnerLanguage;
  const timeStr = formatDateTime(startTime, user.timezone);

  return [
    `\u2500\u2500\u2500\u2500 <b>${escapeHtml(partnerName)}</b> \u2500\u2500\u2500\u2500`,
    `${lang} \u21C4 ${partnerLang}  \u00B7  ${timeStr}`,
    '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500',
  ].join('\n');
}

export function formatDateTime(date: Date, timezone?: string): string {
  try {
    const opts: Intl.DateTimeFormatOptions = {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone || 'UTC',
    };
    const formatted = new Intl.DateTimeFormat('en-US', opts).format(date);
    const tzAbbr = timezone ? `(${timezone.split('/').pop()?.replace(/_/g, ' ')})` : '(UTC)';
    return `${formatted} ${tzAbbr}`;
  } catch {
    return date.toISOString().replace('T', ' ').slice(0, 16) + ' (UTC)';
  }
}
