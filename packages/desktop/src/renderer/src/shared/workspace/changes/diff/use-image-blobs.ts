import type { GitFileBlob, GitFileRef } from '@preload/index';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import type { DiffFileStatus } from '@renderer/shared/workspace/changes/diff/types';
import { useEffect, useState } from 'preact/hooks';

export type ImageBlobsState = { kind: 'loading' } | { kind: 'loaded'; after: string; before: string };

const skipsBefore = new Set<DiffFileStatus>(['added', 'untracked']);

const dataUrl = (blob: GitFileBlob) => `data:${blob.mime};base64,${blob.data}`;

const wantsSide = (status: DiffFileStatus, side: 'before' | 'after', sidePath: string) => {
  if (!sidePath) return false;
  if (side === 'before') return !skipsBefore.has(status);
  return status !== 'deleted';
};

const fetchBlob = (cwd: string, filePath: string, ref: GitFileRef) =>
  window.pi.app.gitFileBlob(cwd, filePath, ref).catch(() => {});

const loadSide = (cwd: string, filePath: string, ref: GitFileRef, want: boolean) =>
  want ? fetchBlob(cwd, filePath, ref).then((blob) => (blob ? dataUrl(blob) : '')) : Promise.resolve('');

export const useImageBlobs = (cwd: string, file: PatchFile, status: DiffFileStatus): ImageBlobsState => {
  const [state, setState] = useState<ImageBlobsState>({ kind: 'loading' });
  const wantBefore = wantsSide(status, 'before', file.oldPath);
  const wantAfter = wantsSide(status, 'after', file.newPath);

  useEffect(() => {
    if (!cwd) {
      setState({ kind: 'loaded', after: '', before: '' });
      return;
    }

    let active = true;
    setState({ kind: 'loading' });

    void Promise.all([
      loadSide(cwd, file.oldPath, 'head', wantBefore),
      loadSide(cwd, file.newPath, 'working', wantAfter)
    ]).then(([before, after]) => {
      if (active) setState({ kind: 'loaded', after, before });
    });

    return () => {
      active = false;
    };
  }, [cwd, wantAfter, wantBefore, file.newPath, file.oldPath]);

  return state;
};
