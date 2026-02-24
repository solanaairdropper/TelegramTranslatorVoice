// Compact callback data encoding
// Format: {action}:{objectId hex}
// Actions are 1-2 chars, ObjectId is 24 hex chars
// Total: max ~27 bytes, well within 64-byte Telegram limit

export type CallbackAction =
  | 'o'   // See Original
  | 'l'   // See Literal
  | 'c'   // Clarify
  | 'n'   // Condense
  | 'x'   // Expand
  | 't'   // Tone Check
  | 'd'   // Done (revert)
  | 'mo'  // More options (open submenu)
  | 'lp'  // Language pick (value is language code)
  | 'dp'  // Dialect pick
  | 'lc'  // Language confirm
  | 'lx'  // Language change
  | 'sc'  // Start chat
  | 'jn'  // Join chat
  | 'jl'  // Join list (pick session)
  | 'jc'  // Join code entry
  | 'st'  // Settings
  | 'mn'  // Menu
  | 'ye'  // Yes/confirm
  | 'no'  // No/cancel
  | 'dh'  // Delete history
  | 'kh'  // Keep history
  | 'rc'  // Resume chat
  | 'ec'  // End chat from menu
  | 'cs'; // Cancel session (waiting)

export function encode(action: CallbackAction, id?: string): string {
  if (id) return `${action}:${id}`;
  return action;
}

export function decode(data: string): { action: CallbackAction; id?: string } {
  const sep = data.indexOf(':');
  if (sep === -1) return { action: data as CallbackAction };
  return {
    action: data.slice(0, sep) as CallbackAction,
    id: data.slice(sep + 1),
  };
}
