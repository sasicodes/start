import { parseMarkdown } from '@renderer/markdown/parser';
import type { MarkdownBlockNode, MarkdownInlineNode } from '@renderer/markdown/types';
import { CopyButton } from '@renderer/ui/copy';
import { cn } from '@renderer/utils/cn';
import type { JSX } from 'preact';
import { useMemo } from 'preact/hooks';

export type MarkdownDensity = 'compact' | 'default';

type MarkdownProps = {
  source: string;
  density?: MarkdownDensity;
};

type MarkdownBlockProps = {
  block: MarkdownBlockNode;
  density: MarkdownDensity;
  nodeKey: string;
};

type MarkdownBlockOf<Type extends MarkdownBlockNode['type']> = Extract<MarkdownBlockNode, { type: Type }>;

type MarkdownNodeProps<Type extends MarkdownBlockNode['type']> = {
  block: MarkdownBlockOf<Type>;
  nodeKey: string;
};

type MarkdownContextProps<Type extends MarkdownBlockNode['type']> = MarkdownNodeProps<Type> & {
  density: MarkdownDensity;
};

const headingElement = (depth: number) => `h${Math.min(Math.max(depth, 1), 6)}` as keyof JSX.IntrinsicElements;

const renderInlineNodes = (nodes: MarkdownInlineNode[], keyPrefix: string) =>
  nodes.map((node, index) => renderInlineNode(node, `${keyPrefix}-${index}`));

const renderInlineNode = (node: MarkdownInlineNode, key: string) => {
  switch (node.type) {
    case 'text':
      return node.text;
    case 'code':
      return (
        <code key={key} class="rounded-md bg-ink/[0.055] px-1 py-0.5 text-[0.92em] text-ink dark:bg-white/[0.075]">
          {node.text}
        </code>
      );
    case 'strong':
      return (
        <strong key={key} class="font-semibold text-ink">
          {renderInlineNodes(node.children, key)}
        </strong>
      );
    case 'emphasis':
      return (
        <em key={key} class="italic">
          {renderInlineNodes(node.children, key)}
        </em>
      );
    case 'link':
      return (
        <a key={key} class="text-hover underline underline-offset-3" href={node.href} target="_blank" rel="noreferrer">
          {renderInlineNodes(node.children, key)}
        </a>
      );
  }
};

const diffLineTone = (language: string | undefined, line: string) => {
  if (language?.toLowerCase() !== 'diff') return '';
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'meta';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'remove';
  return '';
};

const renderCodeLine = (line: string, index: number, lines: string[], language: string | undefined, key: string) => {
  const tone = diffLineTone(language, line);

  return (
    <span
      key={`${key}-${index}`}
      class={cn(tone === 'add' && 'text-success', tone === 'remove' && 'text-danger', tone === 'meta' && 'text-soft')}
    >
      {line}
      {index < lines.length - 1 ? '\n' : ''}
    </span>
  );
};

const MarkdownCodeBlock = ({ block, density, nodeKey }: MarkdownContextProps<'code'>) => {
  const lines = block.text.split('\n');
  const renderedLines = lines.map((line, index) => renderCodeLine(line, index, lines, block.language, nodeKey));

  return (
    <div class="group/code my-2 overflow-hidden rounded-lg border border-line bg-ink/[0.035] dark:bg-white/[0.055]">
      <div
        class={cn(
          'flex items-center justify-between gap-2 border-b border-line bg-ink/[0.025] px-3 py-1 text-soft dark:bg-white/[0.035]',
          density === 'compact' ? 'text-sm leading-5' : 'text-[11px] leading-4'
        )}
      >
        <span class="min-w-0 truncate">{block.language || 'code'}</span>
        <CopyButton
          ariaLabel="Copy code"
          text={block.text}
          class="-mr-1 grid size-6 place-items-center rounded-md border-0 bg-transparent text-soft opacity-0 transition-[background-color,color,opacity] ease-in hover:bg-line hover:text-hover group-hover/code:opacity-100 focus-visible:opacity-100"
        />
      </div>
      <pre class="m-0">
        <code
          class={cn(
            'block overflow-x-auto px-3 py-2 text-ink [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            density === 'compact' ? 'text-sm leading-6' : 'text-xs leading-5'
          )}
        >
          {renderedLines}
        </code>
      </pre>
    </div>
  );
};

const MarkdownHeading = ({ block, density, nodeKey }: MarkdownContextProps<'heading'>) => {
  const Heading = headingElement(block.depth);

  if (density === 'compact') {
    return (
      <Heading class="mt-1 mb-0.5 text-sm leading-6 font-semibold text-ink first:mt-0">
        {renderInlineNodes(block.children, nodeKey)}
      </Heading>
    );
  }

  if (block.depth === 1) {
    return (
      <Heading class="mt-1 mb-2 text-base leading-6 font-semibold text-ink">
        {renderInlineNodes(block.children, nodeKey)}
      </Heading>
    );
  }

  if (block.depth === 2) {
    return (
      <Heading class="mt-1 mb-1.5 text-sm leading-6 font-semibold text-ink">
        {renderInlineNodes(block.children, nodeKey)}
      </Heading>
    );
  }

  return (
    <Heading class="mt-1 mb-1 text-sm leading-6 font-semibold text-ink">
      {renderInlineNodes(block.children, nodeKey)}
    </Heading>
  );
};

const MarkdownParagraph = ({ block, nodeKey }: MarkdownNodeProps<'paragraph'>) => (
  <p class={block.spaced ? 'mt-3 mb-1 whitespace-pre-wrap' : 'my-1 whitespace-pre-wrap first:mt-0 last:mb-0'}>
    {renderInlineNodes(block.children, nodeKey)}
  </p>
);

const MarkdownQuote = ({ block, density, nodeKey }: MarkdownContextProps<'blockquote'>) => (
  <blockquote class="my-2 border-l border-line pl-3 text-soft">
    {block.children.map((child, index) => {
      const childKey = `${nodeKey}-${index}`;
      return <MarkdownBlock key={childKey} block={child} density={density} nodeKey={childKey} />;
    })}
  </blockquote>
);

const MarkdownList = ({ block, nodeKey }: MarkdownNodeProps<'list'>) => {
  const List = block.ordered ? 'ol' : 'ul';

  return (
    <List class="my-1 grid gap-1">
      {block.items.map((item, index) => (
        <li key={`${nodeKey}-${index}`} class="grid grid-cols-[1.4rem_1fr] gap-1">
          <span class="text-right text-soft">{item.marker}</span>
          <span>{renderInlineNodes(item.children, `${nodeKey}-${index}`)}</span>
        </li>
      ))}
    </List>
  );
};

const MarkdownBlock = ({ block, density, nodeKey }: MarkdownBlockProps) => {
  switch (block.type) {
    case 'paragraph':
      return <MarkdownParagraph block={block} nodeKey={nodeKey} />;
    case 'heading':
      return <MarkdownHeading block={block} density={density} nodeKey={nodeKey} />;
    case 'code':
      return <MarkdownCodeBlock block={block} density={density} nodeKey={nodeKey} />;
    case 'blockquote':
      return <MarkdownQuote block={block} density={density} nodeKey={nodeKey} />;
    case 'list':
      return <MarkdownList block={block} nodeKey={nodeKey} />;
  }
};

export const Markdown = ({ source, density = 'default' }: MarkdownProps) => {
  const blocks = useMemo(() => parseMarkdown(source), [source]);

  return (
    <div>
      {blocks.map((block, index) => {
        const nodeKey = `markdown-${index}`;
        return <MarkdownBlock key={nodeKey} block={block} density={density} nodeKey={nodeKey} />;
      })}
    </div>
  );
};
