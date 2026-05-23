import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

const autoSubset = [
  'bash',
  'css',
  'go',
  'java',
  'javascript',
  'json',
  'python',
  'rust',
  'sql',
  'typescript',
  'xml',
  'yaml'
];
const maxAutoHighlightLength = 10_000;
const maxHighlightLength = 40_000;

const languageAliases: Record<string, string> = {
  cjs: 'javascript',
  conf: 'ini',
  cts: 'typescript',
  fish: 'bash',
  htm: 'xml',
  html: 'xml',
  js: 'javascript',
  jsonc: 'json',
  jsx: 'javascript',
  md: 'markdown',
  mdx: 'markdown',
  mjs: 'javascript',
  mts: 'typescript',
  patch: 'diff',
  py: 'python',
  rs: 'rust',
  sh: 'bash',
  toml: 'ini',
  ts: 'typescript',
  tsx: 'typescript',
  yml: 'yaml',
  zsh: 'bash'
};

const languages: [string, Parameters<typeof hljs.registerLanguage>[1]][] = [
  ['go', go],
  ['css', css],
  ['ini', ini],
  ['sql', sql],
  ['xml', xml],
  ['bash', bash],
  ['diff', diff],
  ['java', java],
  ['json', json],
  ['rust', rust],
  ['yaml', yaml],
  ['python', python],
  ['markdown', markdown],
  ['javascript', javascript],
  ['dockerfile', dockerfile],
  ['typescript', typescript]
];

let registered = false;

const registerLanguages = () => {
  if (registered) return;
  registered = true;
  for (const [name, language] of languages) {
    hljs.registerLanguage(name, language);
  }
};

export const escapeHtml = (value: string) => value.replace(/[&"'<>]/g, (char) => `&#${char.charCodeAt(0)};`);

export const normalizeCodeLanguage = (language: string | undefined) => {
  const [rawName = ''] = (language ?? '').trim().toLowerCase().split(/\s+/);
  const name = rawName.replace(/^language-/, '');
  if (!name) return '';
  return languageAliases[name] ?? name;
};

export const highlightCode = (code: string, language: string | undefined) => {
  if (!code || code.length > maxHighlightLength) return escapeHtml(code);

  registerLanguages();
  const normalized = normalizeCodeLanguage(language);

  try {
    if (normalized && hljs.getLanguage(normalized)) {
      return hljs.highlight(code, { ignoreIllegals: true, language: normalized }).value;
    }

    if (code.length > maxAutoHighlightLength) return escapeHtml(code);
    return hljs.highlightAuto(code, autoSubset).value;
  } catch {
    return escapeHtml(code);
  }
};
