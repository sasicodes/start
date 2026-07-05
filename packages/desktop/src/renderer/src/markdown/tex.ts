const codeRegionPattern = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]+`)/g;
const blockTexPattern = /\\\[([\s\S]*?)\\\]/g;
const inlineTexPattern = /\\\(([\s\S]*?)\\\)/g;

const convertSegment = (segment: string) =>
  segment
    .replace(blockTexPattern, (_, body: string) => `$$${body}$$`)
    .replace(inlineTexPattern, (_, body: string) => `$${body}$`);

export const normalizeTexDelimiters = (source: string): string => {
  if (!source.includes('\\(') && !source.includes('\\[')) return source;

  return source
    .split(codeRegionPattern)
    .map((part, index) => (index % 2 === 1 ? part : convertSegment(part)))
    .join('');
};
