import { createDiagramConfig } from '@renderer/markdown/diagram';
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { PluginConfig } from 'streamdown';

type PluginName = Exclude<keyof PluginConfig, 'renderers'>;
type LoadedPlugins = Partial<Pick<PluginConfig, PluginName>>;

interface PluginLoadState {
  cjk: boolean;
  code: boolean;
  math: boolean;
  mermaid: boolean;
}

const texMathPattern = /\\\(|\\\[/;
const inlineMathPattern = /(^|[^\\])\$[^$\n]+\$/;
const fencePattern = /^(`{3,}|~{3,})\s*([^`~]*)$/;
const blockMathPattern = /(^|\n)\s*\$\$[\s\S]*?\$\$/;
const cjkTextPattern = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uff00-\uffef]/u;

const pluginModules = {
  cjk: () => import('@streamdown/cjk').then(({ cjk }) => cjk),
  code: () => import('@streamdown/code').then(({ code }) => code),
  math: () =>
    Promise.all([import('@streamdown/math'), import('katex/dist/katex.min.css')]).then(([{ createMathPlugin }]) =>
      createMathPlugin({ errorColor: 'var(--color-soft)', singleDollarTextMath: true })
    ),
  mermaid: () =>
    import('@streamdown/mermaid').then(({ createMermaidPlugin }) =>
      createMermaidPlugin({ config: createDiagramConfig() })
    )
} as const;

const pluginPromises: {
  cjk?: ReturnType<typeof pluginModules.cjk>;
  code?: ReturnType<typeof pluginModules.code>;
  math?: ReturnType<typeof pluginModules.math>;
  mermaid?: ReturnType<typeof pluginModules.mermaid>;
} = {};

const fencedPlugins = (source: string) => {
  let open = false;
  let code = false;
  let mermaid = false;

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
    mermaid: fenced.mermaid,
    cjk: cjkTextPattern.test(source),
    math: blockMathPattern.test(source) || inlineMathPattern.test(source) || texMathPattern.test(source)
  };
};

const loadCjkPlugin = () => {
  pluginPromises.cjk ??= pluginModules.cjk().catch((error: unknown) => {
    delete pluginPromises.cjk;
    throw error;
  });
  return pluginPromises.cjk;
};

const loadCodePlugin = () => {
  pluginPromises.code ??= pluginModules.code().catch((error: unknown) => {
    delete pluginPromises.code;
    throw error;
  });
  return pluginPromises.code;
};

const loadMathPlugin = () => {
  pluginPromises.math ??= pluginModules.math().catch((error: unknown) => {
    delete pluginPromises.math;
    throw error;
  });
  return pluginPromises.math;
};

const loadMermaidPlugin = () => {
  pluginPromises.mermaid ??= pluginModules.mermaid().catch((error: unknown) => {
    delete pluginPromises.mermaid;
    throw error;
  });
  return pluginPromises.mermaid;
};

export const useMarkdownPlugins = (source: string) => {
  const needed = useMemo(() => requiredPlugins(source), [source]);
  const [loadedPlugins, setLoadedPlugins] = useState<LoadedPlugins>({});

  useEffect(() => {
    const pendingLoads: Promise<LoadedPlugins>[] = [];
    if (needed.cjk && !loadedPlugins.cjk) pendingLoads.push(loadCjkPlugin().then((cjk) => ({ cjk })));
    if (needed.code && !loadedPlugins.code) pendingLoads.push(loadCodePlugin().then((code) => ({ code })));
    if (needed.math && !loadedPlugins.math) pendingLoads.push(loadMathPlugin().then((math) => ({ math })));
    if (needed.mermaid && !loadedPlugins.mermaid) {
      pendingLoads.push(loadMermaidPlugin().then((mermaid) => ({ mermaid })));
    }
    if (pendingLoads.length === 0) return;

    let active = true;
    void Promise.all(pendingLoads)
      .then((plugins) => {
        if (!active) return;
        setLoadedPlugins((current) => Object.assign({}, current, ...plugins));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [needed, loadedPlugins.cjk, loadedPlugins.code, loadedPlugins.math, loadedPlugins.mermaid]);

  return useMemo(
    () => ({
      ...(needed.cjk && loadedPlugins.cjk ? { cjk: loadedPlugins.cjk } : {}),
      ...(needed.code && loadedPlugins.code ? { code: loadedPlugins.code } : {}),
      ...(needed.math && loadedPlugins.math ? { math: loadedPlugins.math } : {}),
      ...(needed.mermaid && loadedPlugins.mermaid ? { mermaid: loadedPlugins.mermaid } : {})
    }),
    [needed, loadedPlugins]
  );
};
