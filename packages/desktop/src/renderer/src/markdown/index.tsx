import { lazy, Suspense } from 'preact/compat';

export type MarkdownDensity = 'compact' | 'default';

export interface MarkdownProps {
  source: string;
  streaming?: boolean;
  density?: MarkdownDensity;
}

const MarkdownRenderer = lazy(() =>
  import('@renderer/markdown/renderer').then(({ MarkdownRenderer }) => ({ default: MarkdownRenderer }))
);

export const Markdown = (props: MarkdownProps) => (
  <Suspense fallback={null}>
    <MarkdownRenderer {...props} />
  </Suspense>
);
