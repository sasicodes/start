import type { ChatStatus, EffortLevel } from '@preload/index';

interface SelectionOptions {
  read: () => string;
  write: (key: string) => void;
  select: (key: string) => Promise<ChatStatus>;
  onThinkingLevel: (level: EffortLevel) => void;
}

export const createModelSelection = (options: SelectionOptions) => {
  let revision = 0;
  let context = 0;
  let pending = '';
  let saving = false;
  let completion = Promise.resolve();
  let confirmed = options.read();

  const sync = (key: string, version: number) => {
    if (saving || revision !== version) return;
    confirmed = key;
    options.write(key);
  };

  const reset = (key: string) => {
    revision += 1;
    context += 1;
    pending = '';
    confirmed = key;
    options.write(key);
  };

  const save = async () => {
    try {
      while (pending) {
        const target = pending;
        const version = revision;
        const selectionContext = context;
        pending = '';
        try {
          const status = await options.select(target);
          if (context !== selectionContext) continue;
          if (status.ready) confirmed = status.selectedModelKey ?? target;
          if (revision !== version) continue;
          options.write(confirmed);
          if (status.ready && status.thinkingLevel) options.onThinkingLevel(status.thinkingLevel);
        } catch {
          if (context === selectionContext && revision === version) options.write(confirmed);
        }
      }
    } finally {
      revision += 1;
      saving = false;
    }
  };

  const select = (key: string) => {
    if (key === options.read()) return completion;
    revision += 1;
    pending = key;
    options.write(key);
    if (!saving) {
      saving = true;
      completion = save();
    }
    return completion;
  };

  return { sync, reset, select, settle: () => completion, version: () => revision };
};
