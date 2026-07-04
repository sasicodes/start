import { createGrepTool, defineTool } from '@earendil-works/pi-coding-agent';
import {
  maxFindLimit,
  maxGrepLimit,
  positiveLimit,
  positiveCursor,
  optionalBoolean,
  positiveContext,
  boundedPatterns,
  defaultFindLimit,
  defaultGrepLimit
} from '@main/providers/tools/fff/bounds';
import { findPathsWithRg } from '@main/providers/tools/fff/files';
import { findText, grepText, restartedPagination } from '@main/providers/tools/fff/format';
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
    async execute(_toolCallId, { pattern, path, limit }, signal) {
      const resultLimit = positiveLimit(limit, defaultFindLimit, maxFindLimit);
      const items = await findWorkspacePaths({
        pattern,
        cwd: cwd(),
        limit: resultLimit,
        ...(path ? { path } : {})
      });

      const results =
        items ??
        (await findPathsWithRg({
          pattern,
          cwd: cwd(),
          limit: resultLimit,
          ...(path ? { path } : {}),
          ...(signal ? { signal } : {})
        }));
      if (!results) return toolResult('File search is unavailable in this workspace.', null);

      return toolResult(findText(results), null);
    }
  }),
  defineTool({
    name: 'grep',
    label: 'grep',
    parameters: grepSchema,
    description:
      'Search file contents through the shared repository index. Falls back to built-in content search when the index is unavailable.',
    promptSnippet: 'Search code quickly from the shared repository index.',
    async execute(toolCallId, { pattern, path, glob, ignoreCase, literal, context, limit, cursor }, signal, onUpdate) {
      const resultLimit = positiveLimit(limit, defaultGrepLimit, maxGrepLimit);
      const resultLiteral = optionalBoolean(literal);
      const resultContext = positiveContext(context);
      const resultCursor = positiveCursor(cursor);
      const resultIgnoreCase = optionalBoolean(ignoreCase);

      const runFallback = async () => {
        const fallbackArgs = {
          pattern,
          limit: resultLimit,
          ...(path ? { path } : {}),
          ...(glob ? { glob } : {}),
          context: resultContext,
          ...(resultLiteral !== null ? { literal: resultLiteral } : {}),
          ...(resultIgnoreCase !== null ? { ignoreCase: resultIgnoreCase } : {})
        };
        const result = await createGrepTool(cwd()).execute(toolCallId, fallbackArgs, signal, onUpdate);
        return resultCursor > 0 ? restartedPagination(result) : result;
      };

      const result = await grepWorkspace({
        pattern,
        cwd: cwd(),
        limit: resultLimit,
        cursor: resultCursor,
        context: resultContext,
        ...(path ? { path } : {}),
        ...(glob ? { glob } : {}),
        classifyDefinitions: true,
        mode: resultLiteral ? 'plain' : 'regex',
        ...(resultIgnoreCase !== null ? { ignoreCase: resultIgnoreCase } : {})
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
