import type { MarkdownProps } from '@renderer/markdown';
import type { MermaidConfig } from '@streamdown/mermaid';
import type { ComponentType } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { type PluginConfig, Streamdown, type StreamdownProps } from 'streamdown';

type PluginName = Exclude<keyof PluginConfig, 'renderers'>;

interface PluginLoadState {
  code: boolean;
  cjk: boolean;
  math: boolean;
  mermaid: boolean;
}

type LoadedPlugins = Partial<Pick<PluginConfig, PluginName>>;

const cjkTextPattern = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/u;
const blockMathPattern = /(^|\n)\s*\$\$[\s\S]*?\$\$/;
const inlineMathPattern = /(^|[^\\])\$[^$\n]+\$/;
const texMathPattern = /\\\(|\\\[/;
const fencePattern = /^(`{3,}|~{3,})\s*([^`~]*)$/;

const StreamdownRenderer = Streamdown as unknown as ComponentType<StreamdownProps>;

const streamdownAnimation = {
  animation: 'blurIn',
  duration: 220,
  easing: 'cubic-bezier(0.16,1,0.3,1)'
} as const;

const streamdownControls = {
  code: { copy: true, download: false },
  mermaid: { copy: true, download: true, fullscreen: true, panZoom: true },
  table: { copy: true, download: true, fullscreen: true }
} as const;

const streamdownShikiTheme: NonNullable<StreamdownProps['shikiTheme']> = ['github-light', 'github-dark'];

const streamdownMermaidConfig = {
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

const pluginModules = {
  code: () => import('@streamdown/code').then(({ code }) => code),
  cjk: () => import('@streamdown/cjk').then(({ cjk }) => cjk),
  math: () =>
    Promise.all([import('@streamdown/math'), import('katex/dist/katex.min.css')]).then(([{ createMathPlugin }]) =>
      createMathPlugin({ errorColor: 'var(--color-danger)', singleDollarTextMath: true })
    ),
  mermaid: () =>
    import('@streamdown/mermaid').then(({ createMermaidPlugin }) =>
      createMermaidPlugin({ config: streamdownMermaidConfig })
    )
} as const;

const pluginPromises: {
  code?: ReturnType<typeof pluginModules.code>;
  cjk?: ReturnType<typeof pluginModules.cjk>;
  math?: ReturnType<typeof pluginModules.math>;
  mermaid?: ReturnType<typeof pluginModules.mermaid>;
} = {};

const fencedPlugins = (source: string) => {
  let code = false;
  let mermaid = false;
  let open = false;

  for (const line of source.split('\n')) {
    const fence = fencePattern.exec(line.trim());
    if (!fence) continue;

    if (open) {
      open = false;
      continue;
    }

    const [language = ''] = (fence[2] ?? '').trim().toLowerCase().split(/\s+/);
    if (language === 'mermaid') mermaid = true;
    else code = true;
    open = true;
  }

  return { code, mermaid };
};

const requiredPlugins = (source: string): PluginLoadState => {
  const fenced = fencedPlugins(source);

  return {
    code: fenced.code,
    cjk: cjkTextPattern.test(source),
    math: blockMathPattern.test(source) || inlineMathPattern.test(source) || texMathPattern.test(source),
    mermaid: fenced.mermaid
  };
};

const loadCodePlugin = () => {
  pluginPromises.code ??= pluginModules.code();
  return pluginPromises.code;
};

const loadCjkPlugin = () => {
  pluginPromises.cjk ??= pluginModules.cjk();
  return pluginPromises.cjk;
};

const loadMathPlugin = () => {
  pluginPromises.math ??= pluginModules.math();
  return pluginPromises.math;
};

const loadMermaidPlugin = () => {
  pluginPromises.mermaid ??= pluginModules.mermaid();
  return pluginPromises.mermaid;
};

const useStreamdownPlugins = (source: string) => {
  const needed = useMemo(() => requiredPlugins(source), [source]);
  const [loadedPlugins, setLoadedPlugins] = useState<LoadedPlugins>({});

  useEffect(() => {
    const pendingLoads: Promise<LoadedPlugins>[] = [];
    if (needed.code && !loadedPlugins.code) pendingLoads.push(loadCodePlugin().then((code) => ({ code })));
    if (needed.cjk && !loadedPlugins.cjk) pendingLoads.push(loadCjkPlugin().then((cjk) => ({ cjk })));
    if (needed.math && !loadedPlugins.math) pendingLoads.push(loadMathPlugin().then((math) => ({ math })));
    if (needed.mermaid && !loadedPlugins.mermaid) {
      pendingLoads.push(loadMermaidPlugin().then((mermaid) => ({ mermaid })));
    }
    if (pendingLoads.length === 0) return;

    let active = true;
    void Promise.all(pendingLoads).then((plugins) => {
      if (!active) return;
      setLoadedPlugins((current) => Object.assign({}, current, ...plugins));
    });

    return () => {
      active = false;
    };
  }, [loadedPlugins.code, loadedPlugins.cjk, loadedPlugins.math, loadedPlugins.mermaid, needed]);

  return useMemo(
    () => ({
      ...(needed.code && loadedPlugins.code ? { code: loadedPlugins.code } : {}),
      ...(needed.cjk && loadedPlugins.cjk ? { cjk: loadedPlugins.cjk } : {}),
      ...(needed.math && loadedPlugins.math ? { math: loadedPlugins.math } : {}),
      ...(needed.mermaid && loadedPlugins.mermaid ? { mermaid: loadedPlugins.mermaid } : {})
    }),
    [loadedPlugins, needed]
  );
};

export const StreamdownMarkdown = ({ source, density = 'default', streaming = false }: MarkdownProps) => {
  const plugins = useStreamdownPlugins(source);

  return (
    <StreamdownRenderer
      animated={streamdownAnimation}
      caret="circle"
      className={density === 'compact' ? 'streamdown-compact' : 'streamdown-default'}
      controls={streamdownControls}
      dir="auto"
      isAnimating={streaming}
      lineNumbers={false}
      mode={streaming ? 'streaming' : 'static'}
      parseIncompleteMarkdown={streaming}
      plugins={plugins}
      shikiTheme={streamdownShikiTheme}
    >
      {source}
    </StreamdownRenderer>
  );
};
