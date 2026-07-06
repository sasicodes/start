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
import type { ResolvedModel, WorkflowModelOption } from '@main/subagents/types';
import { workflowToolDescription } from '@main/subagents/utils/catalog';
import { maxSubagentTasks, normalizeSubagentTasks } from '@main/subagents/utils/input';
import { effortLevels } from '@main/types';

const spawnToolParameters = {
  properties: {
    tasks: {
      type: 'array',
      minItems: 1,
      maxItems: maxSubagentTasks,
      description: 'Focused tasks to run in parallel sub-agents.',
      items: {
        type: 'object',
        required: ['prompt', 'model', 'effort'],
        additionalProperties: false,
        properties: {
          prompt: {
            type: 'string',
            description: 'Focused task for one sub-agent.'
          },
          model: {
            type: 'string',
            description: 'Model key for this task, chosen from the models listed in the tool description.'
          },
          effort: {
            type: 'string',
            enum: effortLevels,
            description: 'Reasoning effort for this task.'
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
  settingsManager: SettingsManager;
  customTools: () => ToolDefinition[];
  nameAllocator: () => SubagentNameAllocator;
  availableModels: () => WorkflowModelOption[];
  resolveModel: (key: string) => ResolvedModel | null;
}

export const createSubagentTools = ({
  cwd,
  authStorage,
  customTools,
  resolveModel,
  modelRegistry,
  nameAllocator,
  availableModels,
  settingsManager
}: CreateSubagentToolsOptions) => [
  defineTool({
    label: 'sub-agents',
    name: 'run_workflow',
    executionMode: 'sequential',
    parameters: spawnToolParameters,
    get description() {
      return workflowToolDescription(availableModels());
    },
    promptSnippet: 'Use for independent research, review, or mapping work.',
    prepareArguments: (args) => ({ tasks: normalizeSubagentTasks(args) }),
    async execute(_toolCallId, { tasks }, signal, onUpdate) {
      if (tasks.length === 0) throw new Error('Each workflow task needs a prompt, a model, and an effort level.');

      const result = await runSubagents({
        tasks,
        cwd: cwd(),
        authStorage,
        customTools,
        resolveModel,
        modelRegistry,
        settingsManager,
        ...(signal ? { signal } : {}),
        nameAllocator: nameAllocator(),
        onUpdate: (snapshot) => onUpdate?.(toolResult('Sub-agents are working.', snapshot))
      });

      return toolResult(result.text, result);
    }
  })
];
