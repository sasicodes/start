import { CheckIcon, CopyIcon } from '@renderer/ui/icons';
import { tw } from '@renderer/utils/tw';
import type { AllowElement, StreamdownProps } from 'streamdown';
import { hasFootnoteProperty } from './footnotes';

interface MarkdownIconProps {
  className?: string;
}

const EmptyIcon = () => null;

const MarkdownCopyIcon = ({ className }: MarkdownIconProps) => <CopyIcon class={tw('size-3', className)} />;

const MarkdownCheckIcon = ({ className }: MarkdownIconProps) => <CheckIcon class={tw('size-3', className)} />;

export const allowMarkdownElement: AllowElement = (element) => !hasFootnoteProperty(element.properties);

export const codeThemes: NonNullable<StreamdownProps['shikiTheme']> = ['github-light', 'github-dark'];

export const markdownAnimation = {
  stagger: 0,
  sep: 'word',
  duration: 120,
  easing: 'ease-out',
  animation: 'fadeIn'
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
