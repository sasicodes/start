import { CheckIcon, CopyIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { MermaidConfig } from '@streamdown/mermaid';
import type { AllowElement, StreamdownProps } from 'streamdown';
import { resolveDiagramThemeVariables } from './diagram-theme';

interface MarkdownIconProps {
  className?: string;
}

const EmptyIcon = () => null;

const footnoteProperties = ['dataFootnotes', 'data-footnotes', 'dataFootnoteRef', 'data-footnote-ref'] as const;

const MarkdownCopyIcon = ({ className }: MarkdownIconProps) => <CopyIcon class={tw('size-3', className)} />;

const MarkdownCheckIcon = ({ className }: MarkdownIconProps) => <CheckIcon class={tw('size-3', className)} />;

const hasFootnoteProperty = (properties: unknown) =>
  typeof properties === 'object' &&
  properties !== null &&
  footnoteProperties.some((property) => property in properties);

export const allowMarkdownElement: AllowElement = (element) => !hasFootnoteProperty(element.properties);

export const codeThemes: NonNullable<StreamdownProps['shikiTheme']> = ['github-light', 'github-dark'];

export const markdownAnimation = {
  stagger: 0,
  sep: 'word',
  duration: 140,
  easing: 'ease-out',
  animation: 'blurIn'
} as const;

export const markdownControls = {
  table: false,
  mermaid: false,
  code: { copy: true, download: false }
} as const;

export const markdownDisallowedElements = ['img'] as const;

export const markdownIcons = {
  XIcon: EmptyIcon,
  ZoomInIcon: EmptyIcon,
  Loader2Icon: EmptyIcon,
  ZoomOutIcon: EmptyIcon,
  DownloadIcon: EmptyIcon,
  RotateCcwIcon: EmptyIcon,
  Maximize2Icon: EmptyIcon,
  CopyIcon: MarkdownCopyIcon,
  ExternalLinkIcon: EmptyIcon,
  CheckIcon: MarkdownCheckIcon
} as unknown as NonNullable<StreamdownProps['icons']>;

export const markdownLinkSafety = {
  enabled: false
} as const;

export const markdownRepair = {
  linkMode: 'text-only'
} as const;

const diagramThemeVariables = {
  fontFamily: 'system-ui',
  background: 'transparent',
  tertiaryColor: 'transparent',
  lineColor: 'var(--color-soft)',
  nodeBorder: 'var(--color-line)',
  mainBkg: 'var(--color-composer)',
  primaryTextColor: 'var(--color-ink)',
  secondaryColor: 'var(--color-muted)',
  primaryColor: 'var(--color-composer)',
  tertiaryTextColor: 'var(--color-soft)',
  secondaryTextColor: 'var(--color-ink)',
  primaryBorderColor: 'var(--color-line)',
  tertiaryBorderColor: 'var(--color-line)',
  secondaryBorderColor: 'var(--color-line)'
} as const;

export const createDiagramConfig = (): MermaidConfig => ({
  theme: 'base',
  startOnLoad: false,
  fontFamily: 'system-ui',
  securityLevel: 'strict',
  suppressErrorRendering: true,
  themeVariables: resolveDiagramThemeVariables(diagramThemeVariables, (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name)
  )
});
