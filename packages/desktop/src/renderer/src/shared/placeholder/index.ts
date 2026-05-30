export const promptPlaceholderCycleMs = 10000;
export const defaultPromptPlaceholder = 'Ask to plan or work on something';
export const defaultFollowUpPlaceholder = 'Ask for follow-up changes';

const contextThreshold = 60;

export const newSessionPlaceholders = [
  defaultPromptPlaceholder,
  'Type / to load a skill',
  'Type ! to run a shell command',
  'Type @ to attach workspace files',
  'Type ~/ to attach files from home'
];

const followUpPlaceholders = (contextPercent: number) => {
  if (contextPercent < contextThreshold) return [defaultFollowUpPlaceholder];
  const band = Math.floor(contextPercent / 10) * 10;
  return [defaultFollowUpPlaceholder, `Context window at ${band}%`];
};

const pickFromList = (list: readonly string[], fallback: string, index: number) => {
  const wrapped = index % list.length;
  return list[wrapped] ?? fallback;
};

export const promptPlaceholder = (hasTurns: boolean, isCommandMode: boolean, contextPercent: number, index = 0) => {
  if (isCommandMode) return 'Run a shell command';
  if (hasTurns) return pickFromList(followUpPlaceholders(contextPercent), defaultFollowUpPlaceholder, index);
  return pickFromList(newSessionPlaceholders, defaultPromptPlaceholder, index);
};
