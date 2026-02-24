import { InlineKeyboard } from 'grammy';
import { encode } from '../utils/callback-data.js';
import { LANGUAGES, getLanguagePages } from '../utils/language-codes.js';
import { t } from './i18n.js';

// ── Language Selection (3 columns, 9 per page) ──

export function languageKeyboard(page = 0): InlineKeyboard {
  const pages = getLanguagePages(9);
  const currentPage = pages[page] || pages[0];
  const kb = new InlineKeyboard();

  for (let i = 0; i < currentPage.length; i += 3) {
    const lang1 = currentPage[i];
    const lang2 = currentPage[i + 1];
    const lang3 = currentPage[i + 2];
    kb.text(`${lang1.flag} ${lang1.name}`, encode('lp', lang1.code));
    if (lang2) kb.text(`${lang2.flag} ${lang2.name}`, encode('lp', lang2.code));
    if (lang3) kb.text(`${lang3.flag} ${lang3.name}`, encode('lp', lang3.code));
    kb.row();
  }

  const totalPages = pages.length;
  if (totalPages > 1) {
    if (page > 0) kb.text('\u25C0', encode('lp', `pg${page - 1}`));
    kb.text(`${page + 1}/${totalPages}`, encode('lp', 'noop'));
    if (page < totalPages - 1) kb.text('\u25B6', encode('lp', `pg${page + 1}`));
    kb.row();
  }

  return kb;
}

export function dialectKeyboard(dialects: string[], lang?: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const dialect of dialects) {
    kb.text(dialect, encode('dp', dialect)).row();
  }
  kb.text(t(lang, 'btn_standard'), encode('dp', 'none')).row();
  return kb;
}

export function confirmLanguageKeyboard(lang?: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btn_confirm'), encode('lc', 'yes'))
    .text(t(lang, 'btn_change'), encode('lx', 'lang'));
}

// ── Home Card Keyboard (contextual) ──

export interface HomeKeyboardOptions {
  hasPendingSession?: boolean;
  hasActiveSession?: boolean;
}

export function homeKeyboard(lang: string | undefined, opts?: HomeKeyboardOptions): InlineKeyboard {
  const kb = new InlineKeyboard();

  if (opts?.hasActiveSession) {
    kb.text(t(lang, 'btn_resume'), encode('rc', 'resume'));
    kb.text(t(lang, 'btn_end'), encode('ec', 'end'));
    kb.row();
  }

  if (opts?.hasPendingSession) {
    kb.text(t(lang, 'btn_copy_link'), encode('sc', 'copy'));
    kb.text(t(lang, 'btn_cancel'), encode('cs', 'cancel'));
    kb.row();
  }

  if (!opts?.hasActiveSession) {
    kb.text(t(lang, 'btn_start_chat'), encode('sc', 'new'));
    kb.text(t(lang, 'btn_join_chat'), encode('jn', 'join'));
    kb.row();
  }

  kb.text(t(lang, 'btn_settings'), encode('st', 'open'));

  return kb;
}

// ── Waiting for partner ──

export function waitingKeyboard(lang?: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btn_copy_link'), encode('sc', 'copy'))
    .text(t(lang, 'btn_cancel'), encode('cs', 'cancel'));
}

// ── Session / Join ──

export function waitingSessionsKeyboard(sessions: Array<{ name: string; code: string; timeAgo: string; id: string }>, lang?: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const s of sessions) {
    kb.text(`${s.name} \u2022 ${s.timeAgo}`, encode('jl', s.id)).row();
  }
  kb.text(t(lang, 'btn_enter_code'), encode('jc', 'manual'))
    .text(t(lang, 'btn_back'), encode('mn', 'back'));
  return kb;
}

export function confirmJoinKeyboard(sessionId: string, lang?: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btn_join'), encode('ye', sessionId))
    .text(t(lang, 'btn_cancel'), encode('no', 'cancel'));
}

// ── Per-Message: Single "..." button → submenu ──

export function translationButtonsKeyboard(messageId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('\u2022\u2022\u2022', encode('mo', messageId));
}

export function translationSubmenuKeyboard(messageId: string, lang?: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btn_original'), encode('o', messageId))
    .text(t(lang, 'btn_literal'), encode('l', messageId))
    .text(t(lang, 'btn_clarify'), encode('c', messageId))
    .row()
    .text(t(lang, 'btn_condense'), encode('n', messageId))
    .text(t(lang, 'btn_expand'), encode('x', messageId))
    .text(t(lang, 'btn_tone'), encode('t', messageId))
    .row()
    .text(t(lang, 'btn_close'), encode('d', messageId));
}

export function doneKeyboard(messageId: string, lang?: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btn_back'), encode('d', messageId));
}

// ── Chat End ──

export function endChatKeyboard(lang?: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btn_delete_history'), encode('dh', 'yes'))
    .text(t(lang, 'btn_keep'), encode('kh', 'no'));
}

// ── Settings ──

export function settingsKeyboard(lang?: string): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, 'btn_language'), encode('lx', 'lang'))
    .text(t(lang, 'btn_dialect'), encode('lx', 'dialect'))
    .row()
    .text(t(lang, 'btn_back'), encode('mn', 'back'));
}
