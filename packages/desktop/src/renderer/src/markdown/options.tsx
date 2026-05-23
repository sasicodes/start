import { CheckIcon, CopyIcon } from '@renderer/ui/icons';
import { cn } from '@renderer/utils/cn';
import type { MermaidConfig } from '@streamdown/mermaid';
import type { AllowElement, StreamdownProps } from 'streamdown';

interface MarkdownIconProps {
  className?: string;
}

const footnoteProperties = ['dataFootnotes', 'data-footnotes', 'dataFootnoteRef', 'data-footnote-ref'] as const;

const EmptyIcon = () => null;

const MarkdownCheckIcon = ({ className }: MarkdownIconProps) => <CheckIcon class={cn('size-3', className)} />;

const MarkdownCopyIcon = ({ className }: MarkdownIconProps) => <CopyIcon class={cn('size-3', className)} />;

const hasFootnoteProperty = (properties: unknown) =>
  typeof properties === 'object' &&
  properties !== null &&
  footnoteProperties.some((property) => property in properties);

export const allowMarkdownElement: AllowElement = (element) => !hasFootnoteProperty(element.properties);

export const codeThemes: NonNullable<StreamdownProps['shikiTheme']> = ['github-light', 'github-dark'];

export const markdownAnimation = {
  animation: 'blurIn',
  duration: 140,
  easing: 'ease-out',
  sep: 'word',
  stagger: 0
} as const;

export const markdownControls = {
  code: { copy: true, download: false },
  mermaid: false,
  table: false
} as const;

export const markdownDisallowedElements = ['img'] as const;

export const markdownIcons = {
  CheckIcon: MarkdownCheckIcon,
  CopyIcon: MarkdownCopyIcon,
  DownloadIcon: EmptyIcon,
  ExternalLinkIcon: EmptyIcon,
  Loader2Icon: EmptyIcon,
  Maximize2Icon: EmptyIcon,
  RotateCcwIcon: EmptyIcon,
  XIcon: EmptyIcon,
  ZoomInIcon: EmptyIcon,
  ZoomOutIcon: EmptyIcon
} as unknown as NonNullable<StreamdownProps['icons']>;

export const markdownLinkSafety = {
  enabled: false
} as const;

export const markdownRepair = {
  linkMode: 'text-only'
} as const;

export const diagramConfig = {
  fontFamily: 'system-ui',
  securityLevel: 'strict',
  startOnLoad: false,
  suppressErrorRendering: true,
  theme: 'base',
  themeVariables: {
    background: 'transparent',
    fontFamily: 'system-ui',
    lineColor: 'var(--color-soft)',
    mainBkg: 'var(--color-composer)',
    nodeBorder: 'var(--color-line)',
    primaryBorderColor: 'var(--color-line)',
    primaryColor: 'var(--color-composer)',
    primaryTextColor: 'var(--color-ink)',
    secondaryBorderColor: 'var(--color-line)',
    secondaryColor: 'var(--color-muted)',
    secondaryTextColor: 'var(--color-ink)',
    tertiaryBorderColor: 'var(--color-line)',
    tertiaryColor: 'transparent',
    tertiaryTextColor: 'var(--color-soft)'
  }
} satisfies MermaidConfig;
