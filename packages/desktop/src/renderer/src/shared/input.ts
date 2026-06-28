export type CommandInput = {
  command: string;
  excludeFromContext: boolean;
};

export type FinderScope = 'root' | 'workspace';

export type FinderToken = {
  query: string;
  start: number;
  token: string;
  value: string;
  marker: '@' | '~';
  scope: FinderScope;
  folderPath: string;
};

export type SlashCommandToken = {
  query: string;
  start: number;
  token: string;
};

export const commandInput = (draft: string): CommandInput | undefined => {
  const text = draft.trim();
  if (!text.startsWith('!')) return;

  const excludeFromContext = text.startsWith('!!');
  const command = text.slice(excludeFromContext ? 2 : 1).trim();
  if (!command) return;

  return { command, excludeFromContext };
};

export const commandMode = (draft: string) => draft.trimStart().startsWith('!');

export const activeFinderToken = (draft: string): FinderToken | undefined => {
  const match = /(?:^|\s)(@[^\s]*|~\/[^\s]*)$/.exec(draft);
  if (!match?.[1]) return;

  const token = match[1];
  const marker = token[0] as '@' | '~';
  const value = marker === '~' ? token.slice(2) : token.slice(1);
  const slashIndex = value.lastIndexOf('/');
  const folderPath = slashIndex >= 0 ? value.slice(0, slashIndex) : '';

  return {
    marker,
    value,
    folderPath,
    query: slashIndex >= 0 ? value.slice(slashIndex + 1) : value,
    scope: marker === '~' ? 'root' : 'workspace',
    start: draft.length - token.length,
    token
  };
};

export const activeSlashCommandToken = (draft: string): SlashCommandToken | undefined => {
  const match = /^(\s*)(\/[^\s]*)$/u.exec(draft);
  if (!match?.[2]) return;

  const token = match[2];
  const value = token.slice(1);

  return {
    query: value.startsWith('skill:') ? value.slice(6) : value,
    start: match[1]?.length ?? 0,
    token
  };
};

export const finderTokenPrefix = (marker: '@' | '~') => (marker === '~' ? '~/' : '@');

export const newSessionMentionLabel = 'New Session';

const newSessionMentionSource = `(?:^|\\s)@${newSessionMentionLabel}(?=\\s|$)`;
const newSessionMentionMatch = new RegExp(newSessionMentionSource, 'i');
const newSessionMentionStrip = new RegExp(newSessionMentionSource, 'gi');

export const newSessionMention = (draft: string): { prompt: string } | undefined => {
  if (!newSessionMentionMatch.test(draft)) return;
  const prompt = draft.replace(newSessionMentionStrip, ' ').replace(/\s+/g, ' ').trim();
  if (!prompt) return;
  return { prompt };
};
