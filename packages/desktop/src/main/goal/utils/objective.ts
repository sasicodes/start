import * as v from 'valibot';
import { parseUserMentions } from '../../../shared/mentions/utils.js';

export const objectiveSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(8000));

export const mentionedGoal = (prompt: string): string => {
  const parts = parseUserMentions(prompt);
  if (!parts.some((part) => part.kind === 'mention' && part.name === 'goal')) return '';

  let objective = prompt;
  for (const part of parts.reverse()) {
    if (part.kind !== 'mention' || part.name === 'browser') continue;
    const following = objective.slice(part.start + part.text.length).replace(/^[ \t]+/u, '');
    objective = objective.slice(0, part.start) + following;
  }
  if (!objective.trim()) throw new Error('Add an objective after @Goal.');
  return v.parse(objectiveSchema, objective);
};
