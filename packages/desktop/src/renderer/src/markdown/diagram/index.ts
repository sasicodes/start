import { diagramThemeVariables, resolveDiagramThemeVariables } from '@renderer/markdown/diagram/theme';
import type { MermaidConfig } from '@streamdown/mermaid';

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
