import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { nativeImage } from 'electron';

type IconCandidate = {
  filePath: string;
  score: number;
};

const imageExtensions = new Set(['.avif', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const ignoredDirectories = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vercel',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'release'
]);
const maxCandidates = 80;
const maxDepth = 5;
const maxEntries = 8000;
const maxIconBytes = 1_500_000;
const maxSvgBytes = 300_000;
const cachedIconDimension = 96;

const exactIconNameScores = new Map([
  ['app-icon', 980],
  ['appicon', 980],
  ['application-icon', 970],
  ['icon', 960],
  ['favicon', 940],
  ['apple-touch-icon', 920],
  ['touch-icon', 910],
  ['android-chrome', 900],
  ['web-app-manifest', 880],
  ['mstile', 860],
  ['site-icon', 840],
  ['launcher-icon', 820],
  ['adaptive-icon', 800],
  ['logo', 760],
  ['mark', 720]
]);

const partialIconNameScores = [
  { value: 'app-icon', score: 880 },
  { value: 'appicon', score: 880 },
  { value: 'application-icon', score: 870 },
  { value: 'favicon', score: 860 },
  { value: 'apple-touch-icon', score: 840 },
  { value: 'touch-icon', score: 830 },
  { value: 'android-chrome', score: 820 },
  { value: 'web-app-manifest', score: 800 },
  { value: 'mstile', score: 780 },
  { value: 'site-icon', score: 760 },
  { value: 'launcher-icon', score: 740 },
  { value: 'adaptive-icon', score: 720 },
  { value: 'icon', score: 700 },
  { value: 'logo', score: 580 },
  { value: 'mark', score: 540 }
];

const decorativeNameScores = [
  { value: 'screenshot', score: -300 },
  { value: 'background', score: -280 },
  { value: 'banner', score: -240 },
  { value: 'preview', score: -220 },
  { value: 'hero', score: -210 },
  { value: 'tray', score: -190 },
  { value: 'mask', score: -180 },
  { value: 'shadow', score: -160 },
  { value: 'sprite', score: -140 }
];

const sizeNameScores = [
  { value: '1024', score: 330 },
  { value: '512', score: 300 },
  { value: '256', score: 260 },
  { value: '192', score: 240 },
  { value: '180', score: 220 },
  { value: '128', score: 200 },
  { value: '64', score: 80 },
  { value: '48', score: -40 },
  { value: '32', score: -120 },
  { value: '16', score: -160 }
];

const normalizeIconName = (name: string) =>
  name
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replaceAll('_', '-')
    .replaceAll(' ', '-')
    .toLowerCase();

const scoreContains = (name: string, scores: { score: number; value: string }[]) => {
  for (const entry of scores) {
    if (name.includes(entry.value)) return entry.score;
  }
  return 0;
};

const directoryScore = (segments: string[]) => {
  const normalized = segments.join('/');

  if (normalized.includes('src-tauri/icons')) return 700;
  if (normalized.includes('build/icons')) return 660;
  if (normalized.includes('renderer/public')) return 620;
  if (segments.includes('public')) return 580;
  if (segments.includes('app')) return 520;
  if (segments.includes('assets')) return 460;
  if (segments.includes('static')) return 420;
  if (segments.includes('resources')) return 380;
  return 0;
};

const extensionScore = (extension: string) => {
  if (extension === '.svg') return 80;
  if (extension === '.png') return 70;
  if (extension === '.webp') return 58;
  if (extension === '.jpg' || extension === '.jpeg') return 46;
  if (extension === '.ico') return 34;
  if (extension === '.avif') return 28;
  return 12;
};

const nameScore = (name: string) => {
  const normalized = normalizeIconName(name);
  const exactScore = exactIconNameScores.get(normalized);
  if (exactScore) return exactScore;

  return (
    scoreContains(normalized, partialIconNameScores) +
    scoreContains(normalized, sizeNameScores) +
    scoreContains(normalized, decorativeNameScores)
  );
};

const candidateScore = (root: string, filePath: string) => {
  const relativePath = path.relative(root, filePath);
  const segments = relativePath.split(path.sep).map((segment) => segment.toLowerCase());
  const parsed = path.parse(filePath);
  const name = parsed.name.toLowerCase();

  return directoryScore(segments) + nameScore(name) + extensionScore(parsed.ext.toLowerCase()) - segments.length;
};

const compareCandidates = (first: IconCandidate, second: IconCandidate) => {
  if (first.score !== second.score) return second.score - first.score;
  return first.filePath.localeCompare(second.filePath);
};

const shouldSkipDirectory = (name: string) => ignoredDirectories.has(name) || name.startsWith('.');

const scanIconCandidates = async (root: string) => {
  const candidates: IconCandidate[] = [];
  const directories = [{ depth: 0, path: root }];
  let entriesRead = 0;

  while (directories.length > 0 && entriesRead < maxEntries) {
    const directory = directories.shift();
    if (!directory) break;

    const entries = await readdir(directory.path, { withFileTypes: true }).catch(() => []);
    entriesRead += entries.length;

    for (const entry of entries) {
      const filePath = path.join(directory.path, entry.name);

      if (entry.isDirectory()) {
        if (!shouldSkipDirectory(entry.name) && directory.depth < maxDepth) {
          directories.push({ depth: directory.depth + 1, path: filePath });
        }
        continue;
      }

      if (!entry.isFile()) continue;

      const extension = path.extname(entry.name).toLowerCase();
      if (!imageExtensions.has(extension)) continue;

      candidates.push({ filePath, score: candidateScore(root, filePath) });
    }
  }

  return candidates.sort(compareCandidates).slice(0, maxCandidates);
};

const svgDataUrl = async (filePath: string) => {
  const details = await stat(filePath).catch(() => undefined);
  if (!details || details.size > maxSvgBytes) return undefined;

  const source = await readFile(filePath, 'utf8').catch(() => '');
  if (!source.trimStart().startsWith('<svg')) return undefined;
  return `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`;
};

const imageDataUrl = async (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.svg') return svgDataUrl(filePath);

  const details = await stat(filePath).catch(() => undefined);
  if (!details || details.size > maxIconBytes) return undefined;

  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) return undefined;

  const size = image.getSize();
  if (size.width < 24 || size.height < 24) return undefined;

  const scale = Math.min(1, cachedIconDimension / Math.max(size.width, size.height));
  const resized = image.resize({
    quality: 'best',
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale))
  });
  if (resized.isEmpty()) return undefined;

  return `data:image/png;base64,${resized.toPNG().toString('base64')}`;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const generatedWorkspaceIconDataUrl = (folderName: string) => {
  const hash = hashString(folderName);
  const coldHues = [198, 206, 214, 222, 230, 238];
  const firstHue = coldHues[hash % coldHues.length] ?? 214;
  const secondHue = coldHues[Math.floor(hash / coldHues.length) % coldHues.length] ?? 230;
  const angle = 120 + (hash % 18);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop stop-color="hsl(${firstHue} 48% 68%)"/><stop offset="1" stop-color="hsl(${secondHue} 46% 46%)"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

export const workspaceIconDataUrl = async (root: string, folderName: string) => {
  const candidates = await scanIconCandidates(root);

  for (const candidate of candidates) {
    const iconDataUrl = await imageDataUrl(candidate.filePath);
    if (iconDataUrl) return iconDataUrl;
  }

  return generatedWorkspaceIconDataUrl(folderName);
};
