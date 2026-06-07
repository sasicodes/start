import type { PatchFile } from '@renderer/shared/workspace/changes/diff/parser';
import { Reveal } from '@renderer/shared/workspace/changes/diff/reveal';
import type { DiffFileStatus } from '@renderer/shared/workspace/changes/diff/types';
import { useImageBlobs } from '@renderer/shared/workspace/changes/diff/use-image-blobs';
import { memo } from 'preact/compat';

interface ImageDiffProps {
  cwd: string;
  file: PatchFile;
  status: DiffFileStatus;
}

interface ImagePaneProps {
  alt: string;
  src: string;
  label?: string;
}

const ImagePane = ({ alt, src, label }: ImagePaneProps) => (
  <figure class="m-0 flex min-w-0 flex-1 flex-col items-center gap-2">
    <img
      alt={alt}
      src={src}
      loading="lazy"
      decoding="async"
      draggable={false}
      class="max-h-80 max-w-full rounded-lg object-contain"
    />
    {label && <figcaption class="font-sans text-xs leading-4 text-soft">{label}</figcaption>}
  </figure>
);

const Empty = ({ cwd, file }: { cwd: string; file: PatchFile }) => (
  <div class="flex items-center justify-center gap-2 px-4 py-6 font-sans text-sm leading-6 text-soft">
    <span>Preview unavailable.</span>
    <Reveal cwd={cwd} filePath={file.newPath || file.oldPath} />
  </div>
);

const Pair = ({ file, after, before }: { after: string; before: string; file: PatchFile }) => (
  <div class="flex items-stretch gap-4 px-4 py-8">
    <ImagePane src={before} label="before" alt={file.oldPath} />
    <ImagePane src={after} label="after" alt={file.newPath} />
  </div>
);

const Single = ({ alt, src }: { alt: string; src: string }) => (
  <div class="flex justify-center px-4 py-8">
    <ImagePane alt={alt} src={src} />
  </div>
);

export const ImageDiff = memo(({ cwd, file, status }: ImageDiffProps) => {
  const state = useImageBlobs(cwd, file, status);

  if (state.kind === 'loading') return <div class="px-4 py-8" aria-hidden="true" />;

  const { after, before } = state;
  if (!before && !after) return <Empty cwd={cwd} file={file} />;
  if (before && after) return <Pair file={file} after={after} before={before} />;
  return <Single src={after || before} alt={file.newPath || file.oldPath} />;
});
