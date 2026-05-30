import { lazy, Suspense } from 'preact/compat';

export type MarkdownDensity = 'compact' | 'default';

export interface MarkdownProps {
  source: string;
  streaming?: boolean;
  density?: MarkdownDensity;
}

const importMarkdownRenderer = () =>
  import('@renderer/markdown/renderer').then(({ MarkdownRenderer }) => ({ default: MarkdownRenderer }));

let markdownRendererPromise: ReturnType<typeof importMarkdownRenderer> | null = null;

const loadMarkdownRenderer = () => {
  markdownRendererPromise ??= importMarkdownRenderer().catch((error: unknown) => {
    markdownRendererPromise = null;
    throw error;
  });
  return markdownRendererPromise;
};

const MarkdownRenderer = lazy(loadMarkdownRenderer);

export const prewarmMarkdownRenderer = () => {
  loadMarkdownRenderer().catch(() => {});
};

export const Markdown = (props: MarkdownProps) => (
  <Suspense fallback={null}>
    <MarkdownRenderer {...props} />
  </Suspense>
);
