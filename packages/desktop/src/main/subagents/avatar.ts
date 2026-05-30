import { hashString } from '@main/subagents/hash';

const palettes = [
  ['#0f766e', '#99f6e4', '#134e4a'],
  ['#7c3aed', '#ddd6fe', '#4c1d95'],
  ['#c2410c', '#fed7aa', '#7c2d12'],
  ['#2563eb', '#bfdbfe', '#1e3a8a'],
  ['#be123c', '#fecdd3', '#881337'],
  ['#15803d', '#bbf7d0', '#14532d'],
  ['#a16207', '#fef08a', '#713f12'],
  ['#4338ca', '#c7d2fe', '#312e81']
] as const;

const cellCount = 8;

const svgEscape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svgDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const subagentAccentColor = (name: string) => {
  const palette = palettes[hashString(name) % palettes.length] ?? palettes[0];
  return palette[0];
};

export const subagentAvatar = (name: string) => {
  const hash = hashString(name);
  const palette = palettes[hash % palettes.length] ?? palettes[0];
  const cells: string[] = [];

  for (let y = 0; y < cellCount; y += 1) {
    for (let x = 0; x < cellCount / 2; x += 1) {
      const bit = (hash >> ((x + y * 4) % 24)) & 1;
      if (!bit && (x + y) % 3 !== hash % 3) continue;

      const color = palette[(x + y + hash) % palette.length] ?? palette[0];
      const left = x * 4;
      const right = (cellCount - x - 1) * 4;
      cells.push(`<rect x="${left}" y="${y * 4}" width="4" height="4" fill="${color}"/>`);
      if (left !== right) cells.push(`<rect x="${right}" y="${y * 4}" width="4" height="4" fill="${color}"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="${svgEscape(name)}"><rect width="32" height="32" rx="6" fill="${palette[1]}"/><g shape-rendering="crispEdges">${cells.join('')}</g></svg>`;
  return svgDataUrl(svg);
};
