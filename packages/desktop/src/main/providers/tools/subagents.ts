import {
  type AuthStorage,
  defineTool,
  type ModelRegistry,
  type SettingsManager,
  type ToolDefinition
} from '@earendil-works/pi-coding-agent';
import { runSubagents } from '@main/subagents/runtime';
import type { SubagentNameAllocator } from '@main/subagents/allocator';
import type { SubagentRunSnapshot, SubagentTaskInput } from '@main/subagents/types';
import type { EffortLevel } from '@main/types';

const maxTaskCount = 8;

const subagentSpawnSchema = {
  properties: {
    tasks: {
      type: 'array',
      minItems: 1,
      maxItems: maxTaskCount,
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
  model: () => ModelRegistry['getAvailable'] extends () => Array<infer ModelItem> ? ModelItem | null : never;
  authStorage: AuthStorage;
  customTools: () => ToolDefinition[];
  modelRegistry: ModelRegistry;
  thinkingLevel: () => EffortLevel;
  settingsManager: SettingsManager;
  nameAllocator: () => SubagentNameAllocator;
}

const cleanTasks = (tasks: SubagentTaskInput[]) =>
  tasks
    .map((task) => ({ prompt: task.prompt.trim() }))
    .filter((task) => task.prompt)
    .slice(0, maxTaskCount);

const textResult = (text: string, details: SubagentRunSnapshot) => ({
  details,
  content: [{ text, type: 'text' as const }]
});

export const createSubagentTools = ({
  cwd,
  model,
  customTools,
  authStorage,
  nameAllocator,
  modelRegistry,
  thinkingLevel,
  settingsManager
}: CreateSubagentToolsOptions) => [
  defineTool({
    label: 'sub-agents',
    name: 'subagent_spawn',
    parameters: subagentSpawnSchema,
    executionMode: 'sequential',
    description: 'Run focused sub-agents in parallel.',
    promptSnippet: 'Use for independent research, review, or mapping work.',
    async execute(_toolCallId, { tasks }, signal, onUpdate) {
      const selectedModel = model();
      if (!selectedModel) throw new Error('No configured model is available for sub-agents.');

      const clean = cleanTasks(tasks);
      if (clean.length === 0) throw new Error('Enter at least one sub-agent task.');

      const result = await runSubagents({
        tasks: clean,
        model: selectedModel,
        cwd: cwd(),
        customTools,
        authStorage,
        nameAllocator: nameAllocator(),
        modelRegistry,
        settingsManager,
        thinkingLevel: thinkingLevel(),
        ...(signal ? { signal } : {}),
        onUpdate: (snapshot) => onUpdate?.(textResult('Sub-agents are working.', snapshot))
      });

      return textResult(result.text, result);
    }
  })
];
