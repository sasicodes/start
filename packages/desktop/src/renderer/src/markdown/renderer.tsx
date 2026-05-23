import type { MarkdownProps } from '@renderer/markdown';
import {
  codeThemes,
  markdownIcons,
  markdownRepair,
  markdownControls,
  markdownAnimation,
  markdownLinkSafety,
  allowMarkdownElement,
  markdownDisallowedElements
} from '@renderer/markdown/options';
import { useMarkdownPlugins } from '@renderer/markdown/plugins';
import { markdownComponents } from '@renderer/markdown/table';
import type { ComponentType } from 'preact';
import { Streamdown, type StreamdownProps } from 'streamdown';

const MarkdownEngine = Streamdown as unknown as ComponentType<StreamdownProps>;

export const MarkdownRenderer = ({ source, streaming = false, density = 'default' }: MarkdownProps) => {
  const plugins = useMarkdownPlugins(source);

  return (
    <div dir="auto" class="contents">
      <MarkdownEngine
        caret="block"
        plugins={plugins}
        lineNumbers={false}
        icons={markdownIcons}
        remend={markdownRepair}
        shikiTheme={codeThemes}
        isAnimating={streaming}
        normalizeHtmlIndentation
        controls={markdownControls}
        animated={markdownAnimation}
        components={markdownComponents}
        linkSafety={markdownLinkSafety}
        allowElement={allowMarkdownElement}
        parseIncompleteMarkdown={streaming}
        mode={streaming ? 'streaming' : 'static'}
        disallowedElements={markdownDisallowedElements}
        className={density === 'compact' ? 'markdown-compact' : 'markdown-default'}
      >
        {source}
      </MarkdownEngine>
    </div>
  );
};
