import type { GitFileBlob, GitFileRef } from '@preload/index';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import type { DiffFileStatus } from '@renderer/shared/workspace/changes/diff/types';
import { useEffect, useState } from 'preact/hooks';

export type ImageBlobsState = { kind: 'loading' } | { kind: 'loaded'; after: string; before: string };

interface LoadedImageBlobsState {
  key: string;
  state: ImageBlobsState;
}

const skipsBefore = new Set<DiffFileStatus>(['added', 'untracked']);

const fetchBlob = (cwd: string, filePath: string, ref: GitFileRef) =>
  window.pi.app.gitFileBlob(cwd, filePath, ref).catch(() => {});

const dataUrl = (blob: GitFileBlob) => `data:${blob.mime};base64,${blob.data}`;

const loadSide = (cwd: string, filePath: string, ref: GitFileRef, want: boolean) =>
  want ? fetchBlob(cwd, filePath, ref).then((blob) => (blob ? dataUrl(blob) : '')) : Promise.resolve('');

const wantsSide = (status: DiffFileStatus, side: 'before' | 'after', sidePath: string) => {
  if (!sidePath) return false;
  if (side === 'before') return !skipsBefore.has(status);
  return status !== 'deleted';
};

export const useImageBlobs = (cwd: string, file: PatchFile, status: DiffFileStatus): ImageBlobsState => {
  const [state, setState] = useState<LoadedImageBlobsState>({ key: '', state: { kind: 'loading' } });
  const wantAfter = wantsSide(status, 'after', file.newPath);
  const wantBefore = wantsSide(status, 'before', file.oldPath);
  const key = `${cwd}:${file.oldPath}:${file.newPath}:${wantBefore ? 'before' : ''}:${wantAfter ? 'after' : ''}`;

  useEffect(() => {
    if (!cwd) return;

    let active = true;

    void Promise.all([
      loadSide(cwd, file.oldPath, 'head', wantBefore),
      loadSide(cwd, file.newPath, 'working', wantAfter)
    ]).then(([before, after]) => {
      if (active) setState({ key, state: { kind: 'loaded', after, before } });
    });

    return () => {
      active = false;
    };
  }, [cwd, file.newPath, file.oldPath, key, wantAfter, wantBefore]);

  if (!cwd) return { kind: 'loaded', after: '', before: '' };
  return state.key === key ? state.state : { kind: 'loading' };
};
