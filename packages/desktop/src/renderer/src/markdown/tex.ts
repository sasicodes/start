const protectedRegionPattern = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]+`|\$\$[\s\S]*?\$\$)/g;
const blockTexPattern = /\\\[([\s\S]*?)\\\]/g;
const inlineTexPattern = /\\\(([\s\S]*?)\\\)/g;
const environmentPattern =
  /\\begin\{((?:align|aligned|alignat|array|bmatrix|Bmatrix|cases|equation|gather|gathered|matrix|multline|pmatrix|smallmatrix|split|vmatrix|Vmatrix)\*?)\}[\s\S]*?\\end\{\1\}/g;

const convertSegment = (segment: string) =>
  segment
    .replace(blockTexPattern, (_, body: string) => `$$${body}$$`)
    .replace(inlineTexPattern, (_, body: string) => `$${body}$`)
    .replace(environmentPattern, (environment) => `$$${environment}$$`);

export const normalizeTexDelimiters = (source: string): string => {
  if (!source.includes('\\(') && !source.includes('\\[') && !source.includes('\\begin{')) return source;

  return source
    .split(protectedRegionPattern)
    .map((part, index) => (index % 2 === 1 ? part : convertSegment(part)))
    .join('');
};
