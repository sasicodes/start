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

const maxSubagentTasks = 8;

const spawnToolParameters = {
  properties: {
    tasks: {
      type: 'array',
      minItems: 1,
      maxItems: maxSubagentTasks,
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
  customTools: () => ToolDefinition[];
  model: () => ModelRegistry['getAvailable'] extends () => Array<infer ModelItem> ? ModelItem | null : never;
  modelRegistry: ModelRegistry;
  nameAllocator: () => SubagentNameAllocator;
  thinkingLevel: () => EffortLevel;
  settingsManager: SettingsManager;
}

const validTasks = (tasks: SubagentTaskInput[]) =>
  tasks
    .map((task) => ({ prompt: task.prompt.trim() }))
    .filter((task) => task.prompt)
    .slice(0, maxSubagentTasks);

const toolResult = (text: string, details: SubagentRunSnapshot) => ({
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
    parameters: spawnToolParameters,
    executionMode: 'sequential',
    description: 'Run focused sub-agents in parallel.',
    promptSnippet: 'Use for independent research, review, or mapping work.',
    async execute(_toolCallId, { tasks }, signal, onUpdate) {
      const selectedModel = model();
      if (!selectedModel) throw new Error('No configured model is available for sub-agents.');

      const runnableTasks = validTasks(tasks);
      if (runnableTasks.length === 0) throw new Error('Enter at least one sub-agent task.');

      const result = await runSubagents({
        tasks: runnableTasks,
        model: selectedModel,
        cwd: cwd(),
        customTools,
        authStorage,
        nameAllocator: nameAllocator(),
        modelRegistry,
        settingsManager,
        thinkingLevel: thinkingLevel(),
        ...(signal ? { signal } : {}),
        onUpdate: (snapshot) => onUpdate?.(toolResult('Sub-agents are working.', snapshot))
      });

      return toolResult(result.text, result);
    }
  })
];
