import { diagramConfig } from '@renderer/markdown/options';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { PluginConfig } from 'streamdown';

type PluginName = Exclude<keyof PluginConfig, 'renderers'>;
type LoadedPlugins = Partial<Pick<PluginConfig, PluginName>>;

interface PluginLoadState {
  code: boolean;
  cjk: boolean;
  math: boolean;
  mermaid: boolean;
}

const cjkTextPattern = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/u;
const blockMathPattern = /(^|\n)\s*\$\$[\s\S]*?\$\$/;
const inlineMathPattern = /(^|[^\\])\$[^$\n]+\$/;
const texMathPattern = /\\\(|\\\[/;
const fencePattern = /^(`{3,}|~{3,})\s*([^`~]*)$/;

const pluginModules = {
  code: () => import('@streamdown/code').then(({ code }) => code),
  cjk: () => import('@streamdown/cjk').then(({ cjk }) => cjk),
  math: () =>
    Promise.all([import('@streamdown/math'), import('katex/dist/katex.min.css')]).then(([{ createMathPlugin }]) =>
      createMathPlugin({ errorColor: 'var(--color-soft)', singleDollarTextMath: true })
    ),
  mermaid: () =>
    import('@streamdown/mermaid').then(({ createMermaidPlugin }) => createMermaidPlugin({ config: diagramConfig }))
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

export const useMarkdownPlugins = (source: string) => {
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
