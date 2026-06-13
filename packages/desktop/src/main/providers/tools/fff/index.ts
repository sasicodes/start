import { createFindTool, createGrepTool, defineTool } from '@earendil-works/pi-coding-agent';
import { findWorkspacePaths, grepWorkspace, multiGrepWorkspace } from '@main/search/fff';
import {
  boundedPatterns,
  defaultFindLimit,
  defaultGrepLimit,
  findArgs,
  grepArgs,
  maxFindLimit,
  maxGrepLimit,
  positiveContext,
  positiveCursor,
  positiveLimit
} from '@main/providers/tools/fff/bounds';
import { findText, grepDetails, grepText, toolResult } from '@main/providers/tools/fff/format';
import { findSchema, grepSchema, multiGrepSchema } from '@main/providers/tools/fff/schema';

interface CreateFffToolsOptions {
  cwd: () => string;
}

export const createFffTools = ({ cwd }: CreateFffToolsOptions) => [
  defineTool({
    name: 'find',
    label: 'find',
    parameters: findSchema,
    description:
      'Find files from the shared repository FFF index. Supports fuzzy queries and glob patterns. Falls back to the built-in finder if FFF is unavailable.',
    promptSnippet: 'Find files quickly from the shared repository index.',
    async execute(toolCallId, { pattern, path, limit }, signal, onUpdate) {
      const fallback = createFindTool(cwd());
      const resultLimit = positiveLimit(limit, defaultFindLimit, maxFindLimit);
      const fallbackArgs = findArgs(pattern, path, resultLimit);
      const items = await findWorkspacePaths({
        cwd: cwd(),
        limit: resultLimit,
        pattern,
        ...(path ? { path } : {})
      });

      if (!items) return fallback.execute(toolCallId, fallbackArgs, signal, onUpdate);

      return toolResult(findText(items), {
        backend: 'fff',
        query: pattern,
        resultCount: items.length
      });
    }
  }),
  defineTool({
    name: 'grep',
    label: 'grep',
    parameters: grepSchema,
    description:
      'Search file contents through the shared repository FFF index. Falls back to built-in content search when FFF is unavailable or forced ignore-case is requested.',
    promptSnippet: 'Search code quickly from the shared repository index.',
    async execute(toolCallId, { pattern, path, glob, ignoreCase, literal, context, limit, cursor }, signal, onUpdate) {
      const fallback = createGrepTool(cwd());
      const resultLimit = positiveLimit(limit, defaultGrepLimit, maxGrepLimit);
      const resultContext = positiveContext(context);
      const fallbackArgs = grepArgs(pattern, path, glob, ignoreCase, literal, resultContext, resultLimit);
      if (ignoreCase) return fallback.execute(toolCallId, fallbackArgs, signal, onUpdate);

      const result = await grepWorkspace({
        cwd: cwd(),
        cursor: positiveCursor(cursor),
        limit: resultLimit,
        mode: literal ? 'plain' : 'regex',
        pattern,
        context: resultContext,
        classifyDefinitions: true,
        ...(path ? { path } : {}),
        ...(glob ? { glob } : {})
      });

      if (!result) return fallback.execute(toolCallId, fallbackArgs, signal, onUpdate);

      return toolResult(grepText(result), {
        backend: 'fff',
        query: pattern,
        ...grepDetails(result)
      });
    }
  }),
  defineTool({
    name: 'multi_grep',
    label: 'multi grep',
    parameters: multiGrepSchema,
    description: 'Search for multiple literal patterns with OR logic through the shared repository FFF index.',
    promptSnippet: 'Use for fast OR searches across multiple code identifiers.',
    async execute(_toolCallId, { patterns, constraints, context, limit, cursor }) {
      const resultPatterns = boundedPatterns(patterns);
      const result = await multiGrepWorkspace({
        cwd: cwd(),
        cursor: positiveCursor(cursor),
        limit: positiveLimit(limit, defaultGrepLimit, maxGrepLimit),
        context: positiveContext(context),
        patterns: resultPatterns,
        classifyDefinitions: true,
        ...(constraints ? { constraints } : {})
      });

      if (!result)
        return toolResult('FFF multi-grep is unavailable in this workspace.', {
          backend: 'fff',
          unavailable: true
        });

      return toolResult(grepText(result), {
        backend: 'fff',
        patterns: resultPatterns,
        ...grepDetails(result)
      });
    }
  })
];
