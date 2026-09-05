import type { ChatStatus, EffortLevel } from '@preload/index';

interface SelectionOptions {
  read: () => string;
  write: (key: string) => void;
  thinkingLevel: EffortLevel;
  select: (key: string) => Promise<ChatStatus>;
  selectThinking: (level: EffortLevel) => Promise<ChatStatus>;
  onThinkingLevel: (level: EffortLevel) => void;
}

type Selection = { kind: 'model'; key: string } | { kind: 'thinking'; level: EffortLevel };

export const createModelSelection = (options: SelectionOptions) => {
  let revision = 0;
  let context = 0;
  let saving = false;
  let pending: Selection[] = [];
  let completion = Promise.resolve();
  let confirmed = options.read();
  let thinking = options.thinkingLevel;
  let confirmedThinking = thinking;

  const writeThinking = (level: EffortLevel) => {
    thinking = level;
    options.onThinkingLevel(level);
  };

  const sync = (key: string, version: number, level?: EffortLevel) => {
    if (saving || revision !== version) return;
    confirmed = key;
    options.write(key);
    if (level) {
      confirmedThinking = level;
      writeThinking(level);
    }
  };

  const reset = (key: string, level?: EffortLevel) => {
    revision += 1;
    context += 1;
    pending = [];
    confirmed = key;
    options.write(key);
    if (level) {
      confirmedThinking = level;
      writeThinking(level);
    }
  };

  const restore = () => {
    options.write(confirmed);
    writeThinking(confirmedThinking);
  };

  const save = async () => {
    try {
      while (pending.length > 0) {
        const target = pending.shift();
        if (!target) break;
        const version = revision;
        const selectionContext = context;
        try {
          const status = await (target.kind === 'model'
            ? options.select(target.key)
            : options.selectThinking(target.level));
          if (context !== selectionContext) continue;
          if (status.ready) {
            confirmed = status.selectedModelKey ?? (target.kind === 'model' ? target.key : confirmed);
            confirmedThinking = status.thinkingLevel ?? confirmedThinking;
          }
          if (revision === version) restore();
        } catch {
          if (context === selectionContext && revision === version) restore();
        }
      }
    } finally {
      revision += 1;
      saving = false;
    }
  };

  const enqueue = (selection: Selection) => {
    revision += 1;
    pending = [...pending.filter((target) => target.kind !== selection.kind), selection];
    if (!saving) {
      saving = true;
      completion = save();
    }
    return completion;
  };

  const select = (key: string) => {
    if (key === options.read()) return completion;
    options.write(key);
    return enqueue({ kind: 'model', key });
  };

  const selectThinking = (level: EffortLevel) => {
    if (level === thinking) return completion;
    writeThinking(level);
    return enqueue({ kind: 'thinking', level });
  };

  return { sync, reset, select, selectThinking, settle: () => completion, version: () => revision };
};
