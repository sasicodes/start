import { BrowserIcon, ComposeIcon, GoalFilledIcon } from '@renderer/ui/icons';

type MentionName = 'goal' | 'browser' | 'new-session';

type UserTextPart =
  | { kind: 'text'; text: string; start: number }
  | { kind: 'mention'; text: string; start: number; name: MentionName };

interface UserTextProps {
  text: string;
}

interface MentionIconProps {
  name: MentionName;
}

const labels = { goal: 'Goal', browser: 'Browser', 'new-session': 'New Session' };

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

const MentionIcon = ({ name }: MentionIconProps) => {
  if (name === 'goal') return <GoalFilledIcon />;
  if (name === 'browser') return <BrowserIcon />;
  return <ComposeIcon />;
};

export const UserText = ({ text }: UserTextProps) => (
  <>
    {parseUserMentions(text).map((part) =>
      part.kind === 'text' ? (
        part.text
      ) : (
        <span key={part.start} class="relative whitespace-nowrap pl-5 font-medium text-brand-accent">
          <span class="absolute top-1/2 left-0 size-4 -translate-y-1/2 [&_svg]:size-full">
            <MentionIcon name={part.name} />
          </span>
          {labels[part.name]}
        </span>
      )
    )}
  </>
);
