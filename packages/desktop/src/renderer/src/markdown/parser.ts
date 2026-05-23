import type { MarkdownBlockNode, MarkdownInlineNode } from '@renderer/markdown/types';

const fencePattern = /^(`{3,})([^`]*)$/;
const headingPattern = /^(#{1,6})\s+(.+)$/;
const orderedListPattern = /^\d+[.)]\s+(.+)$/;
const strongLinePattern = /^(?:\*\*[^*]+\*\*|__[^_]+__):?$/;
const unorderedListPattern = /^[-*+]\s+(.+)$/;

const closingFence = (line: string, length: number) => {
  const fence = /^(`{3,})\s*$/.exec(line.trim());
  return Boolean(fence?.[1] && fence[1].length >= length);
};

const pushParagraph = (blocks: MarkdownBlockNode[], lines: string[]) => {
  const text = lines.join('\n').trim();
  if (text) blocks.push({ type: 'paragraph', children: parseInline(text) });
  lines.length = 0;
};

const parseList = (lines: string[], ordered: boolean): MarkdownBlockNode => ({
  type: 'list',
  ordered,
  items: lines.map((line, index) => ({
    marker: ordered ? `${index + 1}.` : '-',
    children: parseInline(line.replace(ordered ? orderedListPattern : unorderedListPattern, '$1'))
  }))
});

const safeLink = (href: string) => {
  const trimmed = href.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (/^[#/]/.test(trimmed)) return trimmed;
  return '';
};

export const parseInline = (text: string): MarkdownInlineNode[] => {
  const nodes: MarkdownInlineNode[] = [];
  let index = 0;

  while (index < text.length) {
    const rest = text.slice(index);
    const code = /^`([^`]+)`/.exec(rest);
    if (code?.[1]) {
      nodes.push({ type: 'code', text: code[1] });
      index += code[0].length;
      continue;
    }

    const link = /^\[([^\]]+)\]\(([^)]+)\)/.exec(rest);
    if (link?.[1] && link[2]) {
      const href = safeLink(link[2]);
      nodes.push(href ? { type: 'link', href, children: parseInline(link[1]) } : { type: 'text', text: link[1] });
      index += link[0].length;
      continue;
    }

    const strong = /^\*\*([^*]+)\*\*/.exec(rest) ?? /^__([^_]+)__/.exec(rest);
    if (strong?.[1]) {
      nodes.push({ type: 'strong', children: parseInline(strong[1]) });
      index += strong[0].length;
      continue;
    }

    const emphasis = /^\*([^*]+)\*/.exec(rest) ?? /^_([^_]+)_/.exec(rest);
    if (emphasis?.[1]) {
      nodes.push({ type: 'emphasis', children: parseInline(emphasis[1]) });
      index += emphasis[0].length;
      continue;
    }

    const nextSpecial = rest.slice(1).search(/[`[*_]/);
    const length = nextSpecial >= 0 ? nextSpecial + 1 : rest.length;
    nodes.push({ type: 'text', text: rest.slice(0, length) });
    index += length;
  }

  return nodes;
};

export const parseMarkdown = (source: string): MarkdownBlockNode[] => {
  const blocks: MarkdownBlockNode[] = [];
  const paragraphLines: string[] = [];
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? '';
    const trimmed = line.trim();
    const fence = fencePattern.exec(trimmed);

    if (fence?.[1]) {
      pushParagraph(blocks, paragraphLines);
      const codeLines: string[] = [];
      const fenceLength = fence[1].length;
      const language = fence[2]?.trim();
      index += 1;
      while (index < lines.length && !closingFence(lines[index] ?? '', fenceLength)) {
        codeLines.push(lines[index] ?? '');
        index += 1;
      }
      blocks.push({ type: 'code', text: codeLines.join('\n'), ...(language ? { language } : {}) });
      index += 1;
      continue;
    }

    if (!trimmed) {
      pushParagraph(blocks, paragraphLines);
      index += 1;
      continue;
    }

    const heading = headingPattern.exec(trimmed);
    if (heading?.[1] && heading[2]) {
      pushParagraph(blocks, paragraphLines);
      blocks.push({ type: 'heading', depth: heading[1].length, children: parseInline(heading[2]) });
      index += 1;
      continue;
    }

    if (strongLinePattern.test(trimmed)) {
      pushParagraph(blocks, paragraphLines);
      blocks.push({ type: 'paragraph', children: parseInline(trimmed), spaced: true });
      index += 1;
      continue;
    }

    if (trimmed.startsWith('>')) {
      pushParagraph(blocks, paragraphLines);
      const quoteLines: string[] = [];
      while (index < lines.length && (lines[index] ?? '').trim().startsWith('>')) {
        quoteLines.push((lines[index] ?? '').trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'blockquote', children: parseMarkdown(quoteLines.join('\n')) });
      continue;
    }

    const listPattern = orderedListPattern.test(trimmed)
      ? orderedListPattern
      : unorderedListPattern.test(trimmed)
        ? unorderedListPattern
        : null;
    if (listPattern) {
      pushParagraph(blocks, paragraphLines);
      const listLines: string[] = [];
      while (index < lines.length && listPattern.test((lines[index] ?? '').trim())) {
        listLines.push((lines[index] ?? '').trim());
        index += 1;
      }
      blocks.push(parseList(listLines, listPattern === orderedListPattern));
      continue;
    }

    paragraphLines.push(line);
    index += 1;
  }

  pushParagraph(blocks, paragraphLines);
  return blocks;
};
