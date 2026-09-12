import {
  defineTool,
  type ModelRuntime,
  type SettingsManager,
  type ToolDefinition
} from '@earendil-works/pi-coding-agent';
import { toolResult } from '@main/providers/tools/result';
import type { SubagentNameAllocator } from '@main/subagents/allocator';
import { runSubagents } from '@main/subagents/runtime';
import type { ResolvedModel, WorkflowModelOption } from '@main/subagents/types';
import { workflowToolDescription } from '@main/subagents/utils/catalog';
import { maxSubagentTasks, normalizeSubagentTasks } from '@main/subagents/utils/input';
import { Workflow } from '@main/subagents/workflow';
import { effortLevels } from '@main/types';
import * as v from 'valibot';

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
  lifetimeSignal?: () => AbortSignal;
  workflows?: Map<string, Workflow>;
  modelRuntime: ModelRuntime;
  settingsManager: SettingsManager;
  customTools: () => ToolDefinition[];
  nameAllocator: () => SubagentNameAllocator;
  availableModels: () => WorkflowModelOption[];
  resolveModel: (key: string) => ResolvedModel | null;
}

export const createSubagentTools = ({
  cwd,
  lifetimeSignal,
  workflows = new Map<string, Workflow>(),
  customTools,
  resolveModel,
  modelRuntime,
  nameAllocator,
  availableModels,
  settingsManager
}: CreateSubagentToolsOptions) => {
  const lookup = (id: string) => {
    const workflow = workflows.get(id);
    if (!workflow) throw new Error('Workflow not found in this session. It may have ended before an app restart.');
    return workflow;
  };
  return [
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

        if ([...workflows.values()].some((workflow) => workflow.running)) {
          throw new Error(
            'A workflow is already running. Use wait_workflow or cancel_workflow before starting another.'
          );
        }
        if (workflows.size >= 8) {
          const oldest = workflows.keys().next().value;
          if (oldest) workflows.delete(oldest);
        }
        const workflow = new Workflow(
          (runSignal, update) =>
            runSubagents({
              tasks,
              cwd: cwd(),
              customTools,
              resolveModel,
              modelRuntime,
              settingsManager,
              signal: runSignal,
              nameAllocator: nameAllocator(),
              onUpdate: update
            }),
          lifetimeSignal?.() ?? signal ?? new AbortController().signal
        );
        workflows.set(workflow.id, workflow);
        const result = await workflow.wait(30000, signal, (snapshot) =>
          onUpdate?.(toolResult('Sub-agents are working.', snapshot))
        );

        return toolResult(result.text, result);
      }
    }),
    defineTool({
      name: 'wait_workflow',
      label: 'check sub-agents',
      executionMode: 'sequential',
      description:
        'Read partial results and current activity for a workflow in this session. Wait up to 30 seconds for an agent to finish, or use waitMs 0 for an immediate check. A returned running status is not a timeout or failure. Keep waiting or cancel explicitly; do not abandon incomplete tasks.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['workflowId', 'waitMs'],
        properties: {
          workflowId: { type: 'string' },
          waitMs: { type: 'number', minimum: 0, maximum: 30000 }
        }
      } as const,
      prepareArguments: (args) =>
        v.parse(
          v.object({
            workflowId: v.pipe(v.string(), v.minLength(1)),
            waitMs: v.pipe(v.number(), v.minValue(0), v.maxValue(30000))
          }),
          args
        ),
      async execute(_id, { workflowId, waitMs }, signal, onUpdate) {
        const result = await lookup(workflowId).wait(waitMs, signal, (snapshot) =>
          onUpdate?.(toolResult('Sub-agents are working.', snapshot))
        );
        return toolResult(result.text, result);
      }
    }),
    defineTool({
      name: 'cancel_workflow',
      label: 'stop sub-agents',
      executionMode: 'sequential',
      description:
        'Cancel all unfinished agents in a workflow. This stops work but does not undo file edits or external actions. Read the returned statuses and partial results before retrying.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['workflowId'],
        properties: { workflowId: { type: 'string' } }
      } as const,
      prepareArguments: (args) => v.parse(v.object({ workflowId: v.pipe(v.string(), v.minLength(1)) }), args),
      async execute(_id, { workflowId }, signal) {
        const workflow = lookup(workflowId);
        workflow.controller.abort();
        const result = await workflow.wait(1000, signal);
        return toolResult(result.text, result);
      }
    })
  ];
};
