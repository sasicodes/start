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
import { normalizeTexDelimiters } from '@renderer/markdown/tex';
import type { ComponentType } from 'preact';
import { useMemo } from 'preact/hooks';
import { Streamdown, type StreamdownProps } from 'streamdown';

const MarkdownEngine = Streamdown as unknown as ComponentType<StreamdownProps>;

export const MarkdownRenderer = ({ source, streaming = false, density = 'default' }: MarkdownProps) => {
  const normalized = useMemo(() => normalizeTexDelimiters(source), [source]);
  const plugins = useMarkdownPlugins(normalized);

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
        {normalized}
      </MarkdownEngine>
    </div>
  );
};
