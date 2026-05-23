export type MarkdownInlineNode =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong'; children: MarkdownInlineNode[] }
  | { type: 'emphasis'; children: MarkdownInlineNode[] }
  | { type: 'link'; children: MarkdownInlineNode[]; href: string };

export type MarkdownBlockNode =
  | { type: 'paragraph'; children: MarkdownInlineNode[]; spaced?: boolean }
  | { type: 'heading'; depth: number; children: MarkdownInlineNode[] }
  | { type: 'code'; text: string; language?: string }
  | { type: 'blockquote'; children: MarkdownBlockNode[] }
  | { type: 'list'; ordered: boolean; items: { children: MarkdownInlineNode[]; marker: string }[] };
