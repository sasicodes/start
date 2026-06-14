import { createFindTool, createGrepTool, defineTool } from '@earendil-works/pi-coding-agent';
import {
  boundedPatterns,
  defaultFindLimit,
  defaultGrepLimit,
  maxFindLimit,
  maxGrepLimit,
  positiveContext,
  positiveCursor,
  positiveLimit
} from '@main/providers/tools/fff/bounds';
import { fallbackFindPattern, findText, grepText, restartedPagination } from '@main/providers/tools/fff/format';
import { findSchema, grepSchema, multiGrepSchema } from '@main/providers/tools/fff/schema';
import { toolResult } from '@main/providers/tools/result';
import { findWorkspacePaths, grepWorkspace, multiGrepWorkspace } from '@main/search/client';

interface CreateFffToolsOptions {
  cwd: () => string;
}

export const createFffTools = ({ cwd }: CreateFffToolsOptions) => [
  defineTool({
    name: 'find',
    label: 'find',
    parameters: findSchema,
    description:
      'Find files from the shared repository index. Supports fuzzy queries and glob patterns. Falls back to the built-in finder if the index is unavailable.',
    promptSnippet: 'Find files quickly from the shared repository index.',
    async execute(toolCallId, { pattern, path, limit }, signal, onUpdate) {
      const resultLimit = positiveLimit(limit, defaultFindLimit, maxFindLimit);
      const items = await findWorkspacePaths({
        cwd: cwd(),
        limit: resultLimit,
        pattern,
        ...(path ? { path } : {})
      });

      if (!items) {
        const fallbackArgs = {
          limit: resultLimit,
          pattern: fallbackFindPattern(pattern),
          ...(path ? { path } : {})
        };
        return createFindTool(cwd()).execute(toolCallId, fallbackArgs, signal, onUpdate);
      }

      return toolResult(findText(items), null);
    }
  }),
  defineTool({
    name: 'grep',
    label: 'grep',
    parameters: grepSchema,
    description:
      'Search file contents through the shared repository index. Falls back to built-in content search when the index is unavailable or a case-insensitive search is requested.',
    promptSnippet: 'Search code quickly from the shared repository index.',
    async execute(toolCallId, { pattern, path, glob, ignoreCase, literal, context, limit, cursor }, signal, onUpdate) {
      const resultLimit = positiveLimit(limit, defaultGrepLimit, maxGrepLimit);
      const resultContext = positiveContext(context);
      const resultCursor = positiveCursor(cursor);

      const runFallback = async () => {
        const fallbackArgs = {
          pattern,
          limit: resultLimit,
          context: resultContext,
          ...(path ? { path } : {}),
          ...(glob ? { glob } : {}),
          ...(typeof literal === 'boolean' ? { literal } : {}),
          ...(typeof ignoreCase === 'boolean' ? { ignoreCase } : {})
        };
        const result = await createGrepTool(cwd()).execute(toolCallId, fallbackArgs, signal, onUpdate);
        return resultCursor > 0 ? restartedPagination(result) : result;
      };

      if (ignoreCase) return runFallback();

      const result = await grepWorkspace({
        cwd: cwd(),
        cursor: resultCursor,
        limit: resultLimit,
        mode: literal ? 'plain' : 'regex',
        pattern,
        context: resultContext,
        classifyDefinitions: true,
        ...(path ? { path } : {}),
        ...(glob ? { glob } : {})
      });

      if (!result) return runFallback();

      return toolResult(grepText(result), null);
    }
  }),
  defineTool({
    name: 'multi_grep',
    label: 'multi grep',
    parameters: multiGrepSchema,
    description: 'Search for multiple literal patterns with OR logic through the shared repository index.',
    promptSnippet: 'Use for fast OR searches across multiple code identifiers.',
    async execute(_toolCallId, { patterns, constraints, context, limit, cursor }) {
      const resultPatterns = boundedPatterns(patterns);
      if (resultPatterns.length === 0)
        return toolResult('No valid patterns provided. Pass at least one non-empty pattern.', null);

      const result = await multiGrepWorkspace({
        cwd: cwd(),
        cursor: positiveCursor(cursor),
        limit: positiveLimit(limit, defaultGrepLimit, maxGrepLimit),
        context: positiveContext(context),
        patterns: resultPatterns,
        classifyDefinitions: true,
        ...(constraints ? { constraints } : {})
      });

      if (!result) return toolResult('Multi-pattern search is unavailable in this workspace. Use grep instead.', null);

      return toolResult(grepText(result), null);
    }
  })
];
