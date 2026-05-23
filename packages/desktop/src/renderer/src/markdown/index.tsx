import { lazy, Suspense } from 'preact/compat';

export type MarkdownDensity = 'compact' | 'default';

export interface MarkdownProps {
  source: string;
  density?: MarkdownDensity;
  streaming?: boolean;
}

const StreamdownMarkdown = lazy(() =>
  import('@renderer/markdown/streamdown').then(({ StreamdownMarkdown }) => ({ default: StreamdownMarkdown }))
);

export const Markdown = (props: MarkdownProps) => (
  <Suspense fallback={null}>
    <StreamdownMarkdown {...props} />
  </Suspense>
);
