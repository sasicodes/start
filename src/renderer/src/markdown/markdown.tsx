import { parseMarkdown } from '@renderer/markdown/parser';
import type { MarkdownBlockNode, MarkdownInlineNode } from '@renderer/markdown/types';
import { CopyButton } from '@renderer/ui/copy';
import type { JSX } from 'preact';
import { useMemo } from 'preact/hooks';

const renderInlineNodes = (nodes: MarkdownInlineNode[], keyPrefix: string) =>
  nodes.map((node, index) => renderInlineNode(node, `${keyPrefix}-${index}`));

const renderInlineNode = (node: MarkdownInlineNode, key: string) => {
  if (node.type === 'text') return node.text;
  if (node.type === 'code')
    return (
      <code key={key} class="rounded-md bg-ink/[0.055] px-1 py-0.5 text-[0.92em] text-ink dark:bg-white/[0.075]">
        {node.text}
      </code>
    );
  if (node.type === 'strong') {
    return (
      <strong key={key} class="font-semibold text-ink">
        {renderInlineNodes(node.children, key)}
      </strong>
    );
  }
  if (node.type === 'emphasis') {
    return (
      <em key={key} class="italic">
        {renderInlineNodes(node.children, key)}
      </em>
    );
  }
  return (
    <a key={key} class="text-hover underline underline-offset-3" href={node.href} target="_blank" rel="noreferrer">
      {renderInlineNodes(node.children, key)}
    </a>
  );
};

const renderCodeBlock = (block: MarkdownBlockNode & { type: 'code' }, key: string) => (
  <div
    key={key}
    class="group/code my-2 overflow-hidden rounded-lg border border-line bg-ink/[0.035] dark:bg-white/[0.055]"
  >
    <div class="flex items-center justify-between gap-2 border-b border-line bg-ink/[0.025] px-3 py-1 text-[11px] leading-4 text-soft dark:bg-white/[0.035]">
      <span class="min-w-0 truncate">{block.language || 'code'}</span>
      <CopyButton
        ariaLabel="Copy code"
        text={block.text}
        class="-mr-1 grid size-6 place-items-center rounded-md border-0 bg-transparent text-soft opacity-0 transition-[background-color,color,opacity] ease-in hover:bg-line hover:text-hover group-hover/code:opacity-100 focus-visible:opacity-100"
      />
    </div>
    <pre class="m-0">
      <code class="block overflow-x-auto px-3 py-2 text-xs leading-5 text-ink">{block.text}</code>
    </pre>
  </div>
);

const renderHeading = (block: MarkdownBlockNode & { type: 'heading' }, key: string) => {
  const Heading = `h${Math.min(block.depth, 6)}` as keyof JSX.IntrinsicElements;
  if (block.depth === 1) {
    return (
      <Heading key={key} class="mt-1 mb-2 text-base leading-6 font-semibold text-ink">
        {renderInlineNodes(block.children, key)}
      </Heading>
    );
  }
  if (block.depth === 2) {
    return (
      <Heading key={key} class="mt-1 mb-1.5 text-[15px] leading-6 font-semibold text-ink">
        {renderInlineNodes(block.children, key)}
      </Heading>
    );
  }
  return (
    <Heading key={key} class="mt-1 mb-1 text-sm leading-6 font-semibold text-ink">
      {renderInlineNodes(block.children, key)}
    </Heading>
  );
};

const renderBlock = (block: MarkdownBlockNode, key: string) => {
  if (block.type === 'paragraph') {
    return (
      <p
        key={key}
        class={block.spaced ? 'mt-3 mb-1 whitespace-pre-wrap' : 'my-1 whitespace-pre-wrap first:mt-0 last:mb-0'}
      >
        {renderInlineNodes(block.children, key)}
      </p>
    );
  }
  if (block.type === 'heading') return renderHeading(block, key);
  if (block.type === 'code') return renderCodeBlock(block, key);
  if (block.type === 'blockquote') {
    return (
      <blockquote key={key} class="my-2 border-l-2 border-line pl-3 text-soft">
        {block.children.map((child, index) => renderBlock(child, `${key}-${index}`))}
      </blockquote>
    );
  }

  const List = block.ordered ? 'ol' : 'ul';
  return (
    <List key={key} class="my-1 grid gap-1">
      {block.items.map((item, index) => (
        <li key={`${key}-${index}`} class="grid grid-cols-[1.4rem_1fr] gap-1">
          <span class="text-right text-soft">{item.marker}</span>
          <span>{renderInlineNodes(item.children, `${key}-${index}`)}</span>
        </li>
      ))}
    </List>
  );
};

export const Markdown = ({ source }: { source: string }) => {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return <div class="start-markdown">{blocks.map((block, index) => renderBlock(block, `markdown-${index}`))}</div>;
};
