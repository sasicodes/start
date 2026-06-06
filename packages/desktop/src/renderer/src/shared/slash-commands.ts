import type { SlashCommandItem } from '@preload/index';
import type { SlashCommandToken } from '@renderer/shared/input';
import { useEffect, useMemo, useState } from 'preact/hooks';

let commandsCached = false;
let cacheGeneration = 0;
let cachedCommands: SlashCommandItem[] = [];
let cachedCommandsPromise: Promise<SlashCommandItem[]> | undefined;

const loadCommands = () => {
  if (cachedCommandsPromise) return cachedCommandsPromise;

  const generation = cacheGeneration;
  const request = window.pi.chat
    .slashCommands()
    .then((commands) => {
      if (cachedCommandsPromise === request) cachedCommandsPromise = undefined;
      if (cacheGeneration !== generation) return cachedCommands;

      cachedCommands = commands;
      commandsCached = true;
      return commands;
    })
    .catch((error: unknown) => {
      if (cachedCommandsPromise === request) cachedCommandsPromise = undefined;
      throw error;
    });

  cachedCommandsPromise = request;
  return request;
};

export const clearSlashCommandsCache = () => {
  cacheGeneration += 1;
  cachedCommandsPromise = undefined;
  commandsCached = false;
  cachedCommands = [];
};

export const useSlashCommandItems = (token?: SlashCommandToken) => {
  const open = Boolean(token);
  const [commands, setCommands] = useState<SlashCommandItem[]>(() => cachedCommands);

  useEffect(() => {
    if (!open) return;

    let disposed = false;

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

  const availableCommands = commandsCached ? cachedCommands : commands;

  return useMemo(() => {
    if (!token) return [];

    const query = token.query.trim().toLowerCase();
    return availableCommands
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
  }, [availableCommands, token]);
};
