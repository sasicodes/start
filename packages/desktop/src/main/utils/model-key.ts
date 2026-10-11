const replacements = new Map([
  ['openai:gpt-5.6-sol', 'openai:gpt-6.1-sol'],
  ['openai:gpt-5.6-luna', 'openai:gpt-6-luna'],
  ['openai:gpt-5.6-terra', 'openai:gpt-6.1-sol'],
  ['openai-codex:gpt-5.6-sol', 'openai-codex:gpt-6.1-sol'],
  ['openai-codex:gpt-5.6-luna', 'openai-codex:gpt-6-luna'],
  ['openai-codex:gpt-5.6-terra', 'openai-codex:gpt-6.1-sol'],
  ['anthropic:claude-sonnet-5', 'anthropic:claude-sonnet-5-5']
]);

export const replacementModelKey = (key: string): string => replacements.get(key) ?? key;
