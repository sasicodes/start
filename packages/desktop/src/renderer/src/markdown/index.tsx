import { lazy, Suspense } from 'preact/compat';

export type MarkdownDensity = 'compact' | 'default';

export interface MarkdownProps {
  source: string;
  density?: MarkdownDensity;
  streaming?: boolean;
}

const MarkdownRenderer = lazy(() =>
  import('@renderer/markdown/renderer').then(({ MarkdownRenderer }) => ({ default: MarkdownRenderer }))
);

export const Markdown = (props: MarkdownProps) => (
  <Suspense fallback={null}>
    <MarkdownRenderer {...props} />
  </Suspense>
);
