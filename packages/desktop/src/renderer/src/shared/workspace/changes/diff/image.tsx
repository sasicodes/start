import type { GitFileBlob, GitFileRef } from '@preload/index';
import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { Reveal } from '@renderer/shared/workspace/changes/diff/reveal';
import type { DiffFileStatus } from '@renderer/shared/workspace/changes/diff/types';
import { memo } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';

interface ImageDiffProps {
  cwd: string;
  file: PatchFile;
  status: DiffFileStatus;
}

const blobDataUrl = (blob: GitFileBlob) => `data:${blob.mime};base64,${blob.data}`;

const needsBefore = (status: DiffFileStatus, oldPath: string) =>
  Boolean(oldPath) && status !== 'added' && status !== 'untracked';

const needsAfter = (status: DiffFileStatus, newPath: string) => Boolean(newPath) && status !== 'deleted';

const fetchBlob = (cwd: string, filePath: string, ref: GitFileRef) =>
  window.pi.app.gitFileBlob(cwd, filePath, ref).catch(() => undefined);

const ImagePane = ({ alt, src, label }: { alt: string; src: string; label?: string }) => (
  <figure class="m-0 flex min-w-0 flex-1 flex-col items-center gap-2">
    <img alt={alt} src={src} class="max-h-80 max-w-full rounded-lg object-contain" />
    {label && <figcaption class="font-sans text-xs leading-4 text-soft">{label}</figcaption>}
  </figure>
);

type ImageLoadState = { kind: 'loaded'; after: string; before: string } | { kind: 'loading' };

export const ImageDiff = memo(({ cwd, file, status }: ImageDiffProps) => {
  const [state, setState] = useState<ImageLoadState>({ kind: 'loading' });

  const wantBefore = needsBefore(status, file.oldPath);
  const wantAfter = needsAfter(status, file.newPath);

  useEffect(() => {
    if (!cwd) {
      setState({ kind: 'loaded', after: '', before: '' });
      return;
    }

    let active = true;
    setState({ kind: 'loading' });
    let before = '';
    let after = '';

    const tasks: Promise<unknown>[] = [];
    if (wantBefore) {
      tasks.push(
        fetchBlob(cwd, file.oldPath, 'head').then((blob) => {
          if (blob) before = blobDataUrl(blob);
        })
      );
    }
    if (wantAfter) {
      tasks.push(
        fetchBlob(cwd, file.newPath, 'working').then((blob) => {
          if (blob) after = blobDataUrl(blob);
        })
      );
    }

    void Promise.all(tasks).then(() => {
      if (active) setState({ kind: 'loaded', after, before });
    });

    return () => {
      active = false;
    };
  }, [cwd, file.newPath, file.oldPath, wantAfter, wantBefore]);

  if (state.kind === 'loading') return <div class="px-4 py-8" aria-hidden="true" />;

  const { after, before } = state;
  if (!before && !after) {
    return (
      <div class="flex items-center justify-center gap-2 px-4 py-6 font-sans text-sm leading-6 text-soft">
        <span>Preview unavailable.</span>
        <Reveal cwd={cwd} filePath={file.newPath || file.oldPath} />
      </div>
    );
  }

  if (before && after) {
    return (
      <div class="flex items-stretch gap-4 px-4 py-8">
        <ImagePane src={before} alt={file.oldPath} label="before" />
        <ImagePane src={after} alt={file.newPath} label="after" />
      </div>
    );
  }

  return (
    <div class="flex justify-center px-4 py-8">
      <ImagePane src={after || before} alt={file.newPath || file.oldPath} />
    </div>
  );
});
