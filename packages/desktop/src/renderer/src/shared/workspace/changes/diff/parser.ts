export type PatchFileStatus = 'added' | 'copied' | 'deleted' | 'modified' | 'renamed';
export type PatchLineKind = 'add' | 'context' | 'meta' | 'remove';

export interface PatchLine {
  content: string;
  kind: PatchLineKind;
  newLine?: number;
  oldLine?: number;
}

export interface PatchHunk {
  header: string;
  lines: PatchLine[];
}

export interface PatchFile {
  added: number;
  displayPath: string;
  hunks: PatchHunk[];
  isBinary: boolean;
  newPath: string;
  oldPath: string;
  removed: number;
  status: PatchFileStatus;
}

interface PatchPathPair {
  newPath: string;
  oldPath: string;
}

const diffGitPrefix = 'diff --git ';
const hunkHeaderPattern = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

const unquotePath = (value: string) => {
  if (!value.startsWith('"') || !value.endsWith('"')) return value;

  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === 'string' ? parsed : value.slice(1, -1);
  } catch {
    return value.slice(1, -1);
  }
};

const cleanPatchPath = (value: string) => {
  const [pathPart = ''] = value.split('\t');
  const pathValue = unquotePath(pathPart.trim());

  if (!pathValue || pathValue === '/dev/null') return '';
  if (pathValue.startsWith('a/') || pathValue.startsWith('b/')) return pathValue.slice(2);
  return pathValue;
};

const parseDiffGitPaths = (line: string): PatchPathPair => {
  const value = line.slice(diffGitPrefix.length);
  const separatorIndex = value.lastIndexOf(' b/');

  if (value.startsWith('a/') && separatorIndex > -1) {
    return {
      newPath: cleanPatchPath(value.slice(separatorIndex + 1)),
      oldPath: cleanPatchPath(value.slice(0, separatorIndex))
    };
  }

  const quotedSeparatorIndex = value.lastIndexOf('" "');
  if (value.startsWith('"') && quotedSeparatorIndex > -1) {
    return {
      newPath: cleanPatchPath(value.slice(quotedSeparatorIndex + 2)),
      oldPath: cleanPatchPath(value.slice(0, quotedSeparatorIndex + 1))
    };
  }

  return { newPath: '', oldPath: '' };
};

const lineNumber = (value: string | undefined) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createPatchFile = (line: string): PatchFile => {
  const paths = parseDiffGitPaths(line);
  const displayPath = paths.newPath || paths.oldPath || 'Unknown file';

  return {
    added: 0,
    displayPath,
    hunks: [],
    isBinary: false,
    newPath: paths.newPath,
    oldPath: paths.oldPath,
    removed: 0,
    status: 'modified'
  };
};

const updateDisplayPath = (file: PatchFile) => {
  file.displayPath = file.newPath || file.oldPath || 'Unknown file';
};

const setFileStatusFromPaths = (file: PatchFile) => {
  if (file.status === 'renamed' || file.status === 'copied') return;
  if (!file.oldPath && file.newPath) file.status = 'added';
  if (file.oldPath && !file.newPath) file.status = 'deleted';
};

const appendLine = (
  hunk: PatchHunk,
  kind: PatchLineKind,
  content: string,
  oldLine: number | undefined,
  newLine: number | undefined
) => {
  hunk.lines.push({
    content,
    kind,
    ...(newLine ? { newLine } : {}),
    ...(oldLine ? { oldLine } : {})
  });
};

const applyFileHeader = (file: PatchFile, line: string) => {
  if (line.startsWith('--- ')) {
    file.oldPath = cleanPatchPath(line.slice(4));
    setFileStatusFromPaths(file);
    updateDisplayPath(file);
    return;
  }

  if (line.startsWith('+++ ')) {
    file.newPath = cleanPatchPath(line.slice(4));
    setFileStatusFromPaths(file);
    updateDisplayPath(file);
    return;
  }

  if (line.startsWith('new file mode ')) {
    file.status = 'added';
    return;
  }

  if (line.startsWith('deleted file mode ')) {
    file.status = 'deleted';
    return;
  }

  if (line.startsWith('rename from ')) {
    file.oldPath = cleanPatchPath(line.slice(12));
    file.status = 'renamed';
    updateDisplayPath(file);
    return;
  }

  if (line.startsWith('rename to ')) {
    file.newPath = cleanPatchPath(line.slice(10));
    file.status = 'renamed';
    updateDisplayPath(file);
    return;
  }

  if (line.startsWith('copy from ')) {
    file.oldPath = cleanPatchPath(line.slice(10));
    file.status = 'copied';
    updateDisplayPath(file);
    return;
  }

  if (line.startsWith('copy to ')) {
    file.newPath = cleanPatchPath(line.slice(8));
    file.status = 'copied';
    updateDisplayPath(file);
    return;
  }

  if (line.startsWith('Binary files ') || line === 'GIT binary patch') file.isBinary = true;
};

export const parseGitPatch = (patch: string): PatchFile[] => {
  const files: PatchFile[] = [];
  let currentFile: PatchFile | undefined;
  let currentHunk: PatchHunk | undefined;
  let newCursor = 0;
  let oldCursor = 0;

  for (const line of patch.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith(diffGitPrefix)) {
      currentFile = createPatchFile(line);
      currentHunk = undefined;
      files.push(currentFile);
      continue;
    }

    if (!currentFile) continue;

    const hunkMatch = hunkHeaderPattern.exec(line);
    if (hunkMatch) {
      oldCursor = lineNumber(hunkMatch[1]);
      newCursor = lineNumber(hunkMatch[3]);
      currentHunk = { header: line, lines: [] };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) {
      applyFileHeader(currentFile, line);
      continue;
    }

    if (line.startsWith('+')) {
      appendLine(currentHunk, 'add', line.slice(1), undefined, newCursor);
      currentFile.added += 1;
      newCursor += 1;
      continue;
    }

    if (line.startsWith('-')) {
      appendLine(currentHunk, 'remove', line.slice(1), oldCursor, undefined);
      currentFile.removed += 1;
      oldCursor += 1;
      continue;
    }

    if (line.startsWith(' ')) {
      appendLine(currentHunk, 'context', line.slice(1), oldCursor, newCursor);
      oldCursor += 1;
      newCursor += 1;
      continue;
    }

    appendLine(currentHunk, 'meta', line, undefined, undefined);
  }

  return files;
};
