import {
  maxContext,
  maxFindLimit,
  maxGrepLimit,
  maxMultiGrepPatterns,
  maxPatternLength
} from '@main/providers/tools/fff/bounds';

export const findSchema = {
  properties: {
    path: {
      type: 'string',
      maxLength: maxPatternLength,
      description: 'Directory to search in.'
    },
    limit: {
      type: 'number',
      maximum: maxFindLimit,
      minimum: 1,
      description: 'Maximum number of results.'
    },
    pattern: {
      type: 'string',
      maxLength: maxPatternLength,
      description: "Glob or fuzzy pattern to match files, e.g. '*.ts', 'settings', or 'src config'."
    }
  },
  type: 'object',
  required: ['pattern'],
  additionalProperties: false
} as const;

export const grepSchema = {
  properties: {
    path: {
      type: 'string',
      maxLength: maxPatternLength,
      description: 'Directory or file constraint.'
    },
    glob: {
      type: 'string',
      maxLength: maxPatternLength,
      description: "File glob constraint, e.g. '*.ts' or '**/*.spec.ts'."
    },
    limit: {
      type: 'number',
      maximum: maxGrepLimit,
      minimum: 1,
      description: 'Maximum number of matches.'
    },
    cursor: {
      type: 'number',
      minimum: 0,
      description: 'Cursor returned by a previous FFF grep result.'
    },
    context: {
      type: 'number',
      maximum: maxContext,
      minimum: 0,
      description: 'Number of lines to show before and after each match.'
    },
    literal: {
      type: 'boolean',
      description: 'Treat pattern as literal text.'
    },
    pattern: {
      type: 'string',
      maxLength: maxPatternLength,
      description: 'Search pattern.'
    },
    ignoreCase: {
      type: 'boolean',
      description: 'Case-insensitive search.'
    }
  },
  type: 'object',
  required: ['pattern'],
  additionalProperties: false
} as const;

export const multiGrepSchema = {
  properties: {
    limit: {
      type: 'number',
      maximum: maxGrepLimit,
      minimum: 1,
      description: 'Maximum number of matches.'
    },
    cursor: {
      type: 'number',
      minimum: 0,
      description: 'Cursor returned by a previous FFF grep result.'
    },
    context: {
      type: 'number',
      maximum: maxContext,
      minimum: 0,
      description: 'Number of lines to show before and after each match.'
    },
    patterns: {
      type: 'array',
      minItems: 1,
      maxItems: maxMultiGrepPatterns,
      items: { type: 'string', maxLength: maxPatternLength },
      description: 'Literal patterns to search with OR logic.'
    },
    constraints: {
      type: 'string',
      maxLength: maxPatternLength,
      description: "File constraints such as '*.{ts,tsx}', 'src/', or '!test/'."
    }
  },
  type: 'object',
  required: ['patterns'],
  additionalProperties: false
} as const;
