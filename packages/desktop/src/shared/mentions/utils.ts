export type MentionName = 'goal' | 'browser' | 'new-session';

export type UserTextPart =
  | { kind: 'text'; text: string; start: number }
  | { kind: 'mention'; text: string; start: number; name: MentionName };

export const parseUserMentions = (text: string): UserTextPart[] => {
  const parts: UserTextPart[] = [];
  const tokens = /`+|~{3,}|(?<!\S)@(Goal|Browser|New Session)(?=\s|$)/gi;
  let code = '';
  let cursor = 0;

  for (const match of text.matchAll(tokens)) {
    const token = match[0];
    const delimiter = token.startsWith('`') || token.startsWith('~');
    if (code) {
      if (delimiter && token[0] === code[0] && (token === code || (code.length >= 3 && token.length >= code.length)))
        code = '';
      continue;
    }
    if (delimiter) {
      code = token;
      continue;
    }

    if (match.index > cursor) parts.push({ kind: 'text', text: text.slice(cursor, match.index), start: cursor });
    const value = token.slice(1).toLowerCase();
    const name = value === 'goal' ? 'goal' : value === 'browser' ? 'browser' : 'new-session';
    parts.push({ kind: 'mention', text: token, start: match.index, name });
    cursor = match.index + token.length;
  }
  if (cursor < text.length) parts.push({ kind: 'text', text: text.slice(cursor), start: cursor });
  return parts;
};
