import {
  type AuthStorage,
  defineTool,
  type ModelRegistry,
  type SettingsManager,
  type ToolDefinition
} from '@earendil-works/pi-coding-agent';
import { toolResult } from '@main/providers/tools/result';
import type { SubagentNameAllocator } from '@main/subagents/allocator';
import { runSubagents } from '@main/subagents/runtime';
import { normalizeSubagentTasks } from '@main/subagents/utils/input';
import type { EffortLevel } from '@main/types';

const spawnToolParameters = {
  properties: {
    tasks: {
      type: 'array',
      minItems: 1,
      description: 'Focused tasks to run in parallel sub-agents.',
      items: {
        type: 'object',
        required: ['prompt'],
        additionalProperties: false,
        properties: {
          prompt: {
            type: 'string',
            description: 'Focused task for one sub-agent.'
          }
        }
      }
    }
  },
  type: 'object',
  required: ['tasks'],
  additionalProperties: false
} as const;

interface CreateSubagentToolsOptions {
  cwd: () => string;
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
  thinkingLevel: () => EffortLevel;
  settingsManager: SettingsManager;
  customTools: () => ToolDefinition[];
  nameAllocator: () => SubagentNameAllocator;
  model: () => ModelRegistry['getAvailable'] extends () => Array<infer ModelItem> ? ModelItem | null : never;
}

export const createSubagentTools = ({
  cwd,
  model,
  authStorage,
  customTools,
  modelRegistry,
  nameAllocator,
  thinkingLevel,
  settingsManager
}: CreateSubagentToolsOptions) => [
  defineTool({
    label: 'sub-agents',
    name: 'subagent_spawn',
    executionMode: 'sequential',
    parameters: spawnToolParameters,
    description: 'Run focused sub-agents in parallel.',
    promptSnippet: 'Use for independent research, review, or mapping work.',
    prepareArguments: (args) => ({ tasks: normalizeSubagentTasks(args) }),
    async execute(_toolCallId, { tasks }, signal, onUpdate) {
      const selectedModel = model();
      if (!selectedModel) throw new Error('No configured model is available for sub-agents.');
      if (tasks.length === 0) throw new Error('Enter at least one sub-agent task.');

      const result = await runSubagents({
        tasks,
        cwd: cwd(),
        authStorage,
        customTools,
        modelRegistry,
        settingsManager,
        model: selectedModel,
        ...(signal ? { signal } : {}),
        nameAllocator: nameAllocator(),
        thinkingLevel: thinkingLevel(),
        onUpdate: (snapshot) => onUpdate?.(toolResult('Sub-agents are working.', snapshot))
      });

      return toolResult(result.text, result);
    }
  })
];
