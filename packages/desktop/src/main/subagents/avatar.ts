import { hashString } from '@main/subagents/hash';

const palettes = [
  ['#0f766e', '#134e4a'],
  ['#7c3aed', '#4c1d95'],
  ['#c2410c', '#7c2d12'],
  ['#2563eb', '#1e3a8a'],
  ['#be123c', '#881337'],
  ['#15803d', '#14532d'],
  ['#a16207', '#713f12'],
  ['#4338ca', '#312e81']
] as const;

const cellCount = 6;

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
    for (let x = 1; x < cellCount / 2; x += 1) {
      const head = y === 0 && x === 2;
      const body = y > 0 && y < 4 && (hash >> ((x + y * 3) % 24)) & 1;
      const feet = y >= 4 && (x + hash) % 2 === 0;
      if (!head && !body && !feet) continue;

      const color = palette[(x + y + hash) % palette.length] ?? palette[0];
      const left = x * 4;
      const right = (cellCount - x - 1) * 4;
      cells.push(`<rect x="${left}" y="${y * 4}" width="4" height="4" fill="${color}"/>`);
      if (left !== right) cells.push(`<rect x="${right}" y="${y * 4}" width="4" height="4" fill="${color}"/>`);
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" role="img" aria-label="${svgEscape(name)}"><g shape-rendering="crispEdges">${cells.join('')}</g></svg>`;
  return svgDataUrl(svg);
};
