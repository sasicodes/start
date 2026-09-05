import { parseUserMentions } from '@renderer/shared/turn/user-text';
import { expect, it } from 'vitest';

const mentions = (text: string) => parseUserMentions(text).filter((part) => part.kind === 'mention');

it('recognizes the three exact standalone mentions case-insensitively', () => {
  expect(mentions('@Goal @browser @NEW SESSION').map((part) => part.name)).toEqual(['goal', 'browser', 'new-session']);
});

it('preserves original spelling and every surrounding whitespace character', () => {
  const text = '  Start @gOaL\n\nusing\t@Browser  with @New Session\r\n';
  const parts = parseUserMentions(text);
  expect(parts.map((part) => part.text).join('')).toBe(text);
  expect(parts.filter((part) => part.kind === 'mention').map((part) => part.text)).toEqual([
    '@gOaL',
    '@Browser',
    '@New Session'
  ]);
  for (const part of parts) expect(text.slice(part.start, part.start + part.text.length)).toBe(part.text);
});

it.each([
  'email@Goal.com',
  '@Goalkeeper',
  '@Browser/file.ts',
  '@Goal.ts',
  '@New Sessions',
  '@New\nSession',
  '@New  Session',
  '@src/index.ts',
  'https://example.com/@Goal',
  '\\@Goal',
  'const target = "@Goal";'
])('leaves unrelated or code-like text intact: %s', (text) => {
  expect(mentions(text)).toEqual([]);
  expect(
    parseUserMentions(text)
      .map((part) => part.text)
      .join('')
  ).toBe(text);
});

it.each([
  '`@Goal`',
  '`` @Goal ` @Browser ``',
  '```text\n@Goal\n@Browser\n```',
  '~~~text\n@Goal\n@Browser\n~~~',
  '```\n~~~\n@Goal\n```',
  '` unfinished @Goal',
  '```text\n@Goal'
])('leaves code spans and fences unchanged: %s', (text) => {
  expect(mentions(text)).toEqual([]);
  expect(
    parseUserMentions(text)
      .map((part) => part.text)
      .join('')
  ).toBe(text);
});

it('resumes recognition after matching code delimiters close', () => {
  const text = '`@Goal` @Browser\n```\n@Browser\n```\n@New Session';
  expect(mentions(text).map((part) => part.name)).toEqual(['browser', 'new-session']);
  expect(
    parseUserMentions(text)
      .map((part) => part.text)
      .join('')
  ).toBe(text);
});

it('keeps repeated mentions distinct and handles empty/plain messages', () => {
  expect(mentions('@Goal @Goal').map((part) => part.start)).toEqual([0, 6]);
  expect(parseUserMentions('')).toEqual([]);
  expect(parseUserMentions('Plain text')).toEqual([{ kind: 'text', text: 'Plain text', start: 0 }]);
});
