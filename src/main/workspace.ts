import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getGitBranch, isGitRepository } from '@main/git';
import { nativeImage } from 'electron';

export type WorkspaceInfo = {
  branchName?: string;
  folderName: string;
  iconDataUrl: string;
};

type IconCandidate = {
  filePath: string;
  score: number;
};

const imageExtensions = new Set(['.avif', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const mimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp']
]);
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
const workspaceCache = new Map<string, Promise<WorkspaceInfo>>();

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
  if (name === 'icon' || name === 'app-icon') return 900;
  if (name === 'logo' || name === 'mark') return 820;
  if (name === 'apple-touch-icon') return 760;
  if (name === 'favicon') return 700;
  if (name.includes('android-chrome-512')) return 660;
  if (name.includes('512')) return 300;
  if (name.includes('256') || name.includes('128')) return 240;
  if (name.includes('32') || name.includes('16')) return -120;
  if (name.includes('tray') || name.includes('mask')) return -180;
  if (name.includes('background') || name.includes('screenshot')) return -260;
  return 0;
};

const candidateScore = (root: string, filePath: string) => {
  const relativePath = path.relative(root, filePath);
  const segments = relativePath.split(path.sep).map((segment) => segment.toLowerCase());
  const parsed = path.parse(filePath);
  const name = parsed.name.toLowerCase();

  return directoryScore(segments) + nameScore(name) + extensionScore(parsed.ext.toLowerCase()) - segments.length;
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

  return candidates.sort((first, second) => second.score - first.score).slice(0, maxCandidates);
};

const svgDataUrl = async (filePath: string) => {
  const source = await readFile(filePath, 'utf8').catch(() => '');
  if (!source.trimStart().startsWith('<svg')) return undefined;
  return `data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}`;
};

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const generatedIconDataUrl = (folderName: string) => {
  const hash = hashString(folderName);
  const coldHues = [198, 206, 214, 222, 230, 238];
  const firstHue = coldHues[hash % coldHues.length] ?? 214;
  const secondHue = coldHues[Math.floor(hash / coldHues.length) % coldHues.length] ?? 230;
  const angle = 120 + (hash % 18);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)"><stop stop-color="hsl(${firstHue} 48% 68%)"/><stop offset="1" stop-color="hsl(${secondHue} 46% 46%)"/></linearGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const imageDataUrl = async (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.svg') return svgDataUrl(filePath);

  const image = nativeImage.createFromPath(filePath);
  if (image.isEmpty()) return undefined;

  const size = image.getSize();
  if (size.width < 24 || size.height < 24) return undefined;

  const data = await readFile(filePath).catch(() => undefined);
  const mimeType = mimeTypes.get(extension);
  if (!data || !mimeType) return undefined;

  return `data:${mimeType};base64,${data.toString('base64')}`;
};

const workspaceInfo = (folderName: string, iconDataUrl: string, branchName: string | undefined): WorkspaceInfo => ({
  ...(branchName ? { branchName } : {}),
  folderName,
  iconDataUrl
});

const readWorkspace = async (cwd: string): Promise<WorkspaceInfo> => {
  const folderName = path.basename(cwd) || cwd;
  const isGitWorkspace = await isGitRepository(cwd);
  const branchName = isGitWorkspace ? await getGitBranch(cwd) : undefined;
  if (!isGitWorkspace) return workspaceInfo(folderName, generatedIconDataUrl(folderName), branchName);

  const candidates = await scanIconCandidates(cwd);

  for (const candidate of candidates) {
    const iconDataUrl = await imageDataUrl(candidate.filePath);
    if (iconDataUrl) return workspaceInfo(folderName, iconDataUrl, branchName);
  }

  return workspaceInfo(folderName, generatedIconDataUrl(folderName), branchName);
};

export const getWorkspace = (cwd = process.cwd()) => {
  const cached = workspaceCache.get(cwd);
  if (cached) return cached;

  const workspacePromise = readWorkspace(cwd);
  workspaceCache.set(cwd, workspacePromise);
  return workspacePromise;
};
