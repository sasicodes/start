import { type CodePluginOptions, createCodePlugin, type HighlightResult } from '@streamdown/code';

const maxHighlightLength = 40_000;
const codeThemes: NonNullable<CodePluginOptions['themes']> = ['github-light', 'github-light'];
const codePlugin = createCodePlugin({ themes: codeThemes });

type HighlightLanguage = Parameters<typeof codePlugin.highlight>[0]['language'];
type HighlightToken = HighlightResult['tokens'][number][number];

const darkTokenColors: Record<string, string> = {
  '#032F62': 'oklch(78% 0.105 235)',
  '#005CC5': 'oklch(76% 0.13 255)',
  '#22863A': 'oklch(76% 0.12 145)',
  '#24292E': 'var(--color-ink)',
  '#6A737D': 'var(--color-soft)',
  '#6F42C1': 'oklch(78% 0.12 305)',
  '#B31D28': 'oklch(74% 0.14 28)',
  '#D73A49': 'oklch(74% 0.14 28)',
  '#E36209': 'oklch(78% 0.14 62)'
};

const languageAliases: Record<string, string> = {
  cjs: 'javascript',
  conf: 'ini',
  cts: 'typescript',
  fish: 'bash',
  htm: 'html',
  js: 'javascript',
  jsonc: 'json',
  jsx: 'jsx',
  md: 'markdown',
  mdx: 'mdx',
  mjs: 'javascript',
  mts: 'typescript',
  patch: 'diff',
  py: 'python',
  rs: 'rust',
  sh: 'bash',
  toml: 'toml',
  ts: 'typescript',
  tsx: 'tsx',
  yml: 'yaml',
  zsh: 'bash'
};

export const escapeHtml = (value: string) => value.replace(/[&"'<>]/g, (char) => `&#${char.charCodeAt(0)};`);

const escapeAttribute = (value: string) => value.replace(/[&"<>]/g, (char) => `&#${char.charCodeAt(0)};`);

export const normalizeCodeLanguage = (language: string | undefined) => {
  const [rawName = ''] = (language ?? '').trim().toLowerCase().split(/\s+/);
  const name = rawName.replace(/^language-/, '');
  if (!name) return '';
  return languageAliases[name] ?? name;
};

const supportedLanguage = (language: string): HighlightLanguage => {
  const normalized = normalizeCodeLanguage(language);
  if (normalized && codePlugin.supportsLanguage(normalized as HighlightLanguage))
    return normalized as HighlightLanguage;
  return 'text' as HighlightLanguage;
};

const assignTokenColor = (styles: Record<string, string>, value: string) => {
  styles['--sdm-c'] = value;
  styles['--sdm-c-dark'] = darkTokenColors[value.toUpperCase()] ?? 'var(--color-ink)';
};

const tokenStyle = (token: HighlightToken) => {
  const styles: Record<string, string> = {};

  for (const [key, value] of Object.entries(token.htmlStyle ?? {})) {
    if (key === '--shiki-dark' || key === '--shiki-dark-bg') continue;
    if (key === 'color') {
      assignTokenColor(styles, value);
      continue;
    }
    if (key === 'background-color') {
      styles['--sdm-bg'] = value;
      continue;
    }
    styles[key] = value;
  }

  if (token.color && !styles['--sdm-c']) assignTokenColor(styles, token.color);
  if (token.bgColor && !styles['--sdm-bg']) styles['--sdm-bg'] = token.bgColor;

  return Object.entries(styles)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
};

const renderToken = (token: HighlightToken) => {
  if (!token.content) return '';

  const style = tokenStyle(token);
  return `<span class="text-[var(--sdm-c,inherit)] dark:text-[var(--sdm-c-dark,var(--sdm-c,inherit))]"${style ? ` style="${escapeAttribute(style)}"` : ''}>${escapeHtml(token.content)}</span>`;
};

const renderTokens = (result: HighlightResult) =>
  result.tokens.map((line) => (line.length === 0 ? '' : line.map(renderToken).join(''))).join('\n');

const highlightTokens = (code: string, language: HighlightLanguage) =>
  new Promise<HighlightResult>((resolve) => {
    const result = codePlugin.highlight({ code, language, themes: codeThemes }, resolve);
    if (result) resolve(result);
  });

export const highlightCode = async (code: string, language: string | undefined) => {
  if (!code || code.length > maxHighlightLength) return escapeHtml(code);

  try {
    return renderTokens(await highlightTokens(code, supportedLanguage(language ?? '')));
  } catch {
    return escapeHtml(code);
  }
};
