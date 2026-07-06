import type { WorkflowModelOption } from '@main/subagents/types';

const scoreLine = (option: WorkflowModelOption) =>
  `- ${option.key} (${option.name}): affordability ${option.score.affordability}, intelligence ${option.score.intelligence}, taste ${option.score.taste}; effort ${option.effortLevels.join('/')}`;

export const workflowModelMenu = (options: WorkflowModelOption[]) => options.map(scoreLine).join('\n');

export const workflowToolDescription = (options: WorkflowModelOption[]) => {
  if (options.length === 0) {
    return 'Run a workflow of focused sub-agents in parallel. No models are configured; set up a provider before spawning sub-agents.';
  }

  return `Run a workflow of focused sub-agents in parallel. Choose a model and effort per task from the scores below (0-10, higher is better; affordability higher means cheaper). Do not default to the highest scores, that wastes tokens. Pick the cheapest model and lowest effort that can still do the task well, and only move up when the task truly needs it: reading, lookups, and mechanical edits belong on a cheap model at low effort; design, UX, and architecture want higher taste; genuinely hard reasoning wants higher intelligence at high or xhigh effort. Match each task to the minimum capability it needs.\n\nModels:\n${workflowModelMenu(options)}`;
};
