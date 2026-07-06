import type { WorkflowModelOption } from '@main/subagents/types';

const scoreLine = (option: WorkflowModelOption) =>
  `- ${option.key} (${option.name}): affordability ${option.score.affordability}, intelligence ${option.score.intelligence}, taste ${option.score.taste}; effort ${option.effortLevels.join('/')}`;

export const workflowModelMenu = (options: WorkflowModelOption[]) => options.map(scoreLine).join('\n');

export const workflowToolDescription = (options: WorkflowModelOption[]) => {
  if (options.length === 0) {
    return 'Run a workflow of focused sub-agents in parallel. No models are configured; set up a provider before spawning sub-agents.';
  }

  return `Run a workflow of focused sub-agents in parallel. Pick a model and effort for each task from the scores below (all scores are 0-10, higher is better; affordability higher means cheaper). Match cheap simple work to a cheaper, lower-intelligence model with low effort; give design, UX, and architecture work a higher-taste model; give hard reasoning a higher-intelligence model with high or xhigh effort.\n\nModels:\n${workflowModelMenu(options)}`;
};
