import { execFile, spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

export type GitChangeSummary = {
  filesChanged: number;
  insertions: number;
  deletions: number;
};

export type GitPatchSectionKind = 'staged' | 'unstaged' | 'untracked';

export type GitPatchSection = GitChangeSummary & {
  kind: GitPatchSectionKind;
  limited: boolean;
  patch: string;
};

export type GitPatch = {
  sections: GitPatchSection[];
};

export type GitFileRef = 'head' | 'working';

export interface GitFileBlob {
  data: string;
  mime: string;
  sizeBytes: number;
}

type GitSectionStats = {
  files: Set<string>;
  insertions: number;
  deletions: number;
};

type UntrackedPatchMode = 'full' | 'none' | 'summary';

type UntrackedFileData = {
  insertions: number;
  patch: string;
  summaryPatch: string;
};

const maxPatchFiles = 2000;
const maxUntrackedFiles = 64;
const gitShowTimeoutMs = 4000;
const maxPatchLines = 200_000;
const gitMaxBuffer = 32 * 1024 * 1024;
const maxUntrackedFileBytes = 512 * 1024;
const execFileAsync = promisify(execFile);
const gitFileBlobMaxBytes = 3 * 1024 * 1024;

const mimeByExtension: Record<string, string> = {
  bmp: 'image/bmp',
  gif: 'image/gif',
  png: 'image/png',
  jpg: 'image/jpeg',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  ico: 'image/x-icon'
};

const mimeFromPath = (filePath: string) => {
  const basename = filePath.split('/').pop() ?? '';
  const dot = basename.lastIndexOf('.');
  if (dot === -1) return 'application/octet-stream';
  return mimeByExtension[basename.slice(dot + 1).toLowerCase()] ?? 'application/octet-stream';
};

const git = async (cwd: string, args: string[], timeout = 1200) => {
  const { stdout } = await execFileAsync('git', args, { cwd, timeout, maxBuffer: gitMaxBuffer });
  return stdout;
};

const gitDiffStaged = (cwd: string, args: string[]) =>
  git(cwd, ['diff', ...args, '--cached', 'HEAD', '--'], 2400).catch(() =>
    git(cwd, ['diff', ...args, '--cached', '--'], 2400).catch(() => '')
  );

const gitDiffUnstaged = (cwd: string, args: string[]) => git(cwd, ['diff', ...args, '--'], 2400).catch(() => '');

const splitGitList = (value: string) => value.split('\0').filter(Boolean);

const getUntrackedFiles = async (cwd: string) =>
  splitGitList(await git(cwd, ['ls-files', '--others', '--exclude-standard', '-z'], 2400).catch(() => ''));

const countTextLines = (content: Buffer) => {
  if (content.length === 0 || content.includes(0)) return 0;

  let lines = content[content.length - 1] === 10 ? 0 : 1;
  for (const byte of content) {
    if (byte === 10) lines += 1;
  }
  return lines;
};

const patchPath = (prefix: 'a' | 'b', filePath: string) => JSON.stringify(`${prefix}/${filePath}`);

const patchLine = (filePath: string) => `diff --git ${patchPath('a', filePath)} ${patchPath('b', filePath)}`;

const fileMode = (mode: number) => ((mode & 0o111) === 0 ? '100644' : '100755');

const splitTextLines = (text: string) => {
  if (!text) return [];
  const normalized = text.replace(/\r\n/g, '\n');
  return normalized.endsWith('\n') ? normalized.slice(0, -1).split('\n') : normalized.split('\n');
};

const untrackedTextPatch = (filePath: string, content: Buffer, mode: number) => {
  const text = content.toString('utf8');
  const lines = splitTextLines(text);
  const header = [
    patchLine(filePath),
    `new file mode ${fileMode(mode)}`,
    'index 0000000..0000000',
    '--- /dev/null',
    `+++ ${patchPath('b', filePath)}`
  ];
  if (lines.length === 0) return header.join('\n');

  return [
    ...header,
    `@@ -0,0 +1,${lines.length} @@`,
    ...lines.map((line) => `+${line}`),
    ...(text.endsWith('\n') ? [] : ['\\ No newline at end of file'])
  ].join('\n');
};

const untrackedHeaderPatch = (filePath: string, mode: number) =>
  [patchLine(filePath), `new file mode ${fileMode(mode)}`, '--- /dev/null', `+++ ${patchPath('b', filePath)}`].join(
    '\n'
  );

const untrackedBinaryPatch = (filePath: string, mode: number) =>
  [
    patchLine(filePath),
    `new file mode ${fileMode(mode)}`,
    'index 0000000..0000000',
    `Binary files /dev/null and ${patchPath('b', filePath)} differ`
  ].join('\n');

const getUntrackedFileData = async (
  cwd: string,
  filePath: string,
  patchMode: UntrackedPatchMode
): Promise<UntrackedFileData> => {
  const absolutePath = path.resolve(cwd, filePath);
  const details = await stat(absolutePath).catch(() => {});
  if (!details?.isFile()) return { insertions: 0, patch: '', summaryPatch: '' };

  const summaryPatch = patchMode === 'none' ? '' : untrackedHeaderPatch(filePath, details.mode);
  if (details.size > maxUntrackedFileBytes) return { insertions: 0, patch: summaryPatch, summaryPatch };

  const content = await readFile(absolutePath).catch(() => {});
  if (!content) return { insertions: 0, patch: summaryPatch, summaryPatch };

  const insertions = countTextLines(content);
  if (patchMode !== 'full' || insertions > maxPatchLines) return { insertions, patch: summaryPatch, summaryPatch };

  return {
    insertions,
    summaryPatch,
    patch: content.includes(0)
      ? untrackedBinaryPatch(filePath, details.mode)
      : untrackedTextPatch(filePath, content, details.mode)
  };
};

const getUntrackedData = async (cwd: string, filePaths: string[], patchMode: UntrackedPatchMode) => {
  const items = await Promise.all(
    filePaths.slice(0, maxUntrackedFiles).map((filePath) => getUntrackedFileData(cwd, filePath, patchMode))
  );

  const insertions = items.reduce((total, item) => total + item.insertions, 0);
  const patchItems =
    patchMode === 'full' && insertions <= maxPatchLines
      ? items
      : items.map((item) => ({
          ...item,
          patch: item.summaryPatch
        }));

  return {
    files: new Set(filePaths),
    deletions: 0,
    insertions,
    patch: patchItems
      .map((item) => item.patch)
      .filter(Boolean)
      .join('\n')
  };
};

const parseNumstat = (value: string) => {
  const files = new Set<string>();
  let deletions = 0;
  let insertions = 0;

  for (const line of value.split('\n')) {
    if (!line) continue;

    const [added, removed, ...pathParts] = line.split('\t');
    const filePath = pathParts.join('\t');
    if (filePath) files.add(filePath);

    const addedCount = Number.parseInt(added ?? '', 10);
    const removedCount = Number.parseInt(removed ?? '', 10);
    if (Number.isFinite(addedCount)) insertions += addedCount;
    if (Number.isFinite(removedCount)) deletions += removedCount;
  }

  return { deletions, files, insertions };
};

const diffStats = (numstat: string, names: string[]): GitSectionStats => {
  const parsed = parseNumstat(numstat);
  const files = new Set(parsed.files);
  for (const filePath of names) files.add(filePath);

  return {
    files,
    deletions: parsed.deletions,
    insertions: parsed.insertions
  };
};

const getWorkingTreeStats = async (cwd: string) => {
  const [stagedNumstat, stagedNames, unstagedNumstat, unstagedNames, untrackedFiles] = await Promise.all([
    gitDiffStaged(cwd, ['--numstat', '-M']),
    gitDiffStaged(cwd, ['--name-only', '-z', '-M']),
    gitDiffUnstaged(cwd, ['--numstat', '-M']),
    gitDiffUnstaged(cwd, ['--name-only', '-z', '-M']),
    getUntrackedFiles(cwd)
  ]);

  return {
    staged: diffStats(stagedNumstat, splitGitList(stagedNames)),
    unstaged: diffStats(unstagedNumstat, splitGitList(unstagedNames)),
    untrackedFiles
  };
};

const canLoadPatch = (stats: GitSectionStats) =>
  stats.files.size <= maxPatchFiles && stats.insertions + stats.deletions <= maxPatchLines;

const patchSection = (
  kind: GitPatchSectionKind,
  patch: string,
  stats: GitSectionStats,
  limited: boolean
): GitPatchSection | undefined => {
  const cleanPatch = patch.trim();
  if (!cleanPatch && stats.files.size === 0) return;

  return {
    kind,
    limited,
    patch: cleanPatch,
    filesChanged: stats.files.size,
    insertions: stats.insertions,
    deletions: stats.deletions
  };
};

const isPatchSection = (section: GitPatchSection | undefined): section is GitPatchSection => Boolean(section);

export const getGitBranch = async (cwd: string) => {
  try {
    const insideWorkTree = (await git(cwd, ['rev-parse', '--is-inside-work-tree'])).trim();
    if (insideWorkTree !== 'true') return;

    const branchName = (await git(cwd, ['branch', '--show-current'])).trim();
    if (branchName) return branchName;

    const tagName = (await git(cwd, ['describe', '--tags', '--exact-match']).catch(() => '')).trim();
    if (tagName) return tagName;

    const commit = (await git(cwd, ['rev-parse', '--short', 'HEAD'])).trim();
    if (commit) return `detached ${commit}`;
    return;
  } catch {
    return;
  }
};

export const getGitChangeSummary = async (cwd: string): Promise<GitChangeSummary | undefined> => {
  try {
    const insideWorkTree = (await git(cwd, ['rev-parse', '--is-inside-work-tree'])).trim();
    if (insideWorkTree !== 'true') return;

    const { staged, unstaged, untrackedFiles } = await getWorkingTreeStats(cwd);
    const untracked = await getUntrackedData(cwd, untrackedFiles, 'none');
    const files = new Set([...staged.files, ...unstaged.files, ...untracked.files]);

    return {
      filesChanged: files.size,
      insertions: staged.insertions + unstaged.insertions + untracked.insertions,
      deletions: staged.deletions + unstaged.deletions + untracked.deletions
    };
  } catch {
    return;
  }
};

export const getGitPatch = async (cwd: string): Promise<GitPatch | undefined> => {
  try {
    const insideWorkTree = (await git(cwd, ['rev-parse', '--is-inside-work-tree'])).trim();
    if (insideWorkTree !== 'true') return;

    const { staged, unstaged, untrackedFiles } = await getWorkingTreeStats(cwd);
    const stagedLimited = !canLoadPatch(staged);
    const unstagedLimited = !canLoadPatch(unstaged);
    const includeUntrackedPatch = untrackedFiles.length <= maxUntrackedFiles && untrackedFiles.length <= maxPatchFiles;
    const untracked = await getUntrackedData(cwd, untrackedFiles, includeUntrackedPatch ? 'full' : 'summary');
    const untrackedLimited = !includeUntrackedPatch || !canLoadPatch(untracked);
    const [stagedPatch, unstagedPatch] = await Promise.all([
      stagedLimited ? '' : gitDiffStaged(cwd, ['--binary', '-M']),
      unstagedLimited ? '' : gitDiffUnstaged(cwd, ['--binary', '-M'])
    ]);

    const sections = [
      patchSection('staged', stagedPatch, staged, stagedLimited),
      patchSection('unstaged', unstagedPatch, unstaged, unstagedLimited),
      patchSection('untracked', untracked.patch, untracked, untrackedLimited)
    ].filter(isPatchSection);

    return { sections };
  } catch {
    return;
  }
};

const readWorkingTreeBuffer = async (cwd: string, filePath: string): Promise<Buffer | undefined> => {
  try {
    const cwdResolved = path.resolve(cwd);
    const absolutePath = path.resolve(cwdResolved, filePath);
    if (!absolutePath.startsWith(cwdResolved + path.sep) && absolutePath !== cwdResolved) return;

    const details = await stat(absolutePath);
    if (!details.isFile() || details.size > gitFileBlobMaxBytes) return;

    return await readFile(absolutePath);
  } catch {
    return;
  }
};

const readHeadBuffer = async (cwd: string, filePath: string): Promise<Buffer | undefined> => {
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      const child = spawn('git', ['show', `HEAD:${filePath}`], { cwd });
      const chunks: Buffer[] = [];
      let size = 0;

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('git show timed out'));
      }, gitShowTimeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > gitFileBlobMaxBytes) {
          child.kill();
          clearTimeout(timer);
          reject(new Error('blob exceeds max size'));
          return;
        }
        chunks.push(chunk);
      });
      child.stderr.on('data', () => {});
      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          reject(new Error(`git show exited ${code}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });
    });
  } catch {
    return;
  }
};

export const getGitFileBlob = async (
  cwd: string,
  filePath: string,
  ref: GitFileRef
): Promise<GitFileBlob | undefined> => {
  if (!cwd || !filePath) return;
  const buffer = ref === 'head' ? await readHeadBuffer(cwd, filePath) : await readWorkingTreeBuffer(cwd, filePath);
  if (!buffer) return;

  return {
    data: buffer.toString('base64'),
    mime: mimeFromPath(filePath),
    sizeBytes: buffer.length
  };
};

export const isGitRepository = async (cwd: string) => {
  try {
    return (await git(cwd, ['rev-parse', '--is-inside-work-tree'])).trim() === 'true';
  } catch {
    return false;
  }
};
