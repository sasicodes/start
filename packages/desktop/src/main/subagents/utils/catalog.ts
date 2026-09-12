import type { WorkflowModelOption } from '@main/subagents/types';

const scoreLine = (option: WorkflowModelOption) =>
  `- ${option.key} (${option.name}): affordability ${option.score.affordability}, intelligence ${option.score.intelligence}, taste ${option.score.taste}; effort ${option.effortLevels.join('/')}`;

export const workflowModelMenu = (options: WorkflowModelOption[]) => options.map(scoreLine).join('\n');

export const workflowToolDescription = (options: WorkflowModelOption[]) => {
  if (options.length === 0) {
    return 'Run a workflow of focused sub-agents in parallel. No models are configured; set up a provider before spawning sub-agents.';
  }

  return `Run independent tasks in parallel subagents. Returns after at most 30 seconds with a workflowId and partial results; agents continue running. Use wait_workflow to collect all outcomes and cancel_workflow to stop unfinished work. Address failures explicitly; do not infer failure from silence or retry side-effecting tasks automatically. Choose an exact model key and a supported effort from the catalog for each task. Use the least expensive model and lowest effort sufficient for the task. Scores are 0-10, higher is better: affordability means cheaper, intelligence means reasoning capability, and taste means design suitability.

Models:
${workflowModelMenu(options)}`;
};
