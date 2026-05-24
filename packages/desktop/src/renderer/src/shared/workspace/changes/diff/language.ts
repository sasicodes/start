import { extensionOf } from '@renderer/shared/workspace/changes/diff/extension';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';

const languageByExtension: Record<string, string> = {
  go: 'go',
  js: 'javascript',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  sh: 'bash',
  ts: 'typescript',
  css: 'css',
  cfg: 'ini',
  env: 'ini',
  htm: 'xml',
  ini: 'ini',
  jsx: 'javascript',
  mdx: 'markdown',
  mjs: 'javascript',
  cjs: 'javascript',
  mts: 'typescript',
  cts: 'typescript',
  sql: 'sql',
  svg: 'xml',
  tsx: 'typescript',
  xml: 'xml',
  yml: 'yaml',
  zsh: 'bash',
  bash: 'bash',
  conf: 'ini',
  diff: 'diff',
  fish: 'bash',
  html: 'xml',
  java: 'java',
  json: 'json',
  scss: 'css',
  toml: 'ini',
  yaml: 'yaml',
  jsonc: 'json',
  patch: 'diff',
  dockerfile: 'dockerfile'
};

const languageFromPath = (filePath: string) => {
  const basename = filePath.split('/').pop() ?? '';
  if (/^dockerfile/i.test(basename)) return 'dockerfile';
  return languageByExtension[extensionOf(filePath)] ?? '';
};

export const patchFileLanguage = (file: PatchFile) =>
  languageFromPath(file.newPath || file.oldPath || file.displayPath);
