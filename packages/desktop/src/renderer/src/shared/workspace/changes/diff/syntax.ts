import { type CodePluginOptions, createCodePlugin, type HighlightResult } from '@streamdown/code';

const maxHighlightLength = 40_000;
const codeThemes: NonNullable<CodePluginOptions['themes']> = ['github-light', 'github-dark'];
const codePlugin = createCodePlugin({ themes: codeThemes });

type HighlightLanguage = Parameters<typeof codePlugin.highlight>[0]['language'];
type HighlightToken = HighlightResult['tokens'][number][number];

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

const tokenClass = 'text-[var(--shiki-light,var(--sdm-c,inherit))] dark:text-[var(--shiki-dark,var(--sdm-c,inherit))]';

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

const tokenStyle = (token: HighlightToken) => {
  const styles: Record<string, string> = { ...(token.htmlStyle ?? {}) };
  if (token.color && !styles['--sdm-c']) styles['--sdm-c'] = token.color;
  if (token.bgColor && !styles['--sdm-bg']) styles['--sdm-bg'] = token.bgColor;

  return Object.entries(styles)
    .map(([key, value]) => `${key}:${value}`)
    .join(';');
};

const renderToken = (token: HighlightToken) => {
  if (!token.content) return '';

  const style = tokenStyle(token);
  return `<span class="${tokenClass}"${style ? ` style="${escapeAttribute(style)}"` : ''}>${escapeHtml(token.content)}</span>`;
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
