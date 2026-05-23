import type { MarkdownProps } from '@renderer/markdown';
import {
  allowMarkdownElement,
  codeThemes,
  markdownAnimation,
  markdownControls,
  markdownDisallowedElements,
  markdownIcons,
  markdownLinkSafety,
  markdownRepair
} from '@renderer/markdown/options';
import { useMarkdownPlugins } from '@renderer/markdown/plugins';
import { markdownComponents } from '@renderer/markdown/table';
import type { ComponentType } from 'preact';
import { Streamdown, type StreamdownProps } from 'streamdown';

const MarkdownEngine = Streamdown as unknown as ComponentType<StreamdownProps>;

export const MarkdownRenderer = ({ source, density = 'default', streaming = false }: MarkdownProps) => {
  const plugins = useMarkdownPlugins(source);

  return (
    <MarkdownEngine
      animated={markdownAnimation}
      allowElement={allowMarkdownElement}
      caret="circle"
      className={density === 'compact' ? 'markdown-compact' : 'markdown-default'}
      components={markdownComponents}
      controls={markdownControls}
      dir="auto"
      disallowedElements={markdownDisallowedElements}
      icons={markdownIcons}
      isAnimating={streaming}
      linkSafety={markdownLinkSafety}
      lineNumbers={false}
      mode={streaming ? 'streaming' : 'static'}
      normalizeHtmlIndentation
      parseIncompleteMarkdown={streaming}
      plugins={plugins}
      remend={markdownRepair}
      shikiTheme={codeThemes}
    >
      {source}
    </MarkdownEngine>
  );
};
