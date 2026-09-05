import type { FinderItem } from '@renderer/shared/finder';
import { activeFinderToken, activeSlashCommandToken, finderTokenPrefix } from '@renderer/shared/input';

export const completeFinderDraft = (draft: string, item: FinderItem, enterDirectory: boolean): string | null => {
  const command = activeSlashCommandToken(draft);
  if (command) return item.type === 'command' ? `${draft.slice(0, command.start)}/${item.name} ` : null;

  const token = activeFinderToken(draft);
  if (!token || item.type === 'command') return null;
  const prefix = `${draft.slice(0, token.start)}${finderTokenPrefix(token.marker)}`;
  if (item.type === 'goal' || item.type === 'browser' || item.type === 'new-session') return `${prefix}${item.name} `;

  const suffix = item.type === 'directory' && enterDirectory ? '/' : ' ';
  return `${prefix}${item.path}${suffix}`;
};
