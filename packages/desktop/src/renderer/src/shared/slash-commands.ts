import type { SlashCommandItem } from '@preload/index';
import type { SlashCommandToken } from '@renderer/shared/input';
import { useEffect, useMemo, useState } from 'preact/hooks';

let cachedCommands: SlashCommandItem[] = [];
let cachedCommandsPromise: Promise<SlashCommandItem[]> | undefined;
let commandsCached = false;

const loadCommands = () => {
  cachedCommandsPromise ??= window.pi.chat
    .slashCommands()
    .then((commands) => {
      cachedCommands = commands;
      commandsCached = true;
      cachedCommandsPromise = undefined;
      return commands;
    })
    .catch((error: unknown) => {
      cachedCommandsPromise = undefined;
      throw error;
    });

  return cachedCommandsPromise;
};

export const clearSlashCommandsCache = () => {
  cachedCommands = [];
  commandsCached = false;
  cachedCommandsPromise = undefined;
};

export const useSlashCommandItems = (token?: SlashCommandToken) => {
  const open = Boolean(token);
  const [commands, setCommands] = useState<SlashCommandItem[]>(() => cachedCommands);

  useEffect(() => {
    if (!open) return;

    let disposed = false;
    if (commandsCached) setCommands(cachedCommands);

    loadCommands()
      .then((items) => {
        if (!disposed) setCommands(items);
      })
      .catch(() => {
        if (!disposed && !commandsCached) setCommands([]);
      });

    return () => {
      disposed = true;
    };
  }, [open]);

  return useMemo(() => {
    if (!token) return [];

    const query = token.query.trim().toLowerCase();
    return commands
      .filter((command) => {
        if (!query) return true;
        return command.name.toLowerCase().includes(query) || command.description.toLowerCase().includes(query);
      })
      .map((command) => ({
        key: command.key,
        name: command.name,
        type: 'command' as const,
        ...(command.description ? { description: command.description } : {})
      }));
  }, [commands, token]);
};
