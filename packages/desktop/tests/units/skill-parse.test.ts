import { parseSkillBlock } from '@renderer/shared/skill/parse';
import { describe, expect, it } from 'vitest';

const block = (body: string) =>
  `<skill name="simplify" location="/Users/me/.agents/skills/simplify/SKILL.md">\nReferences are relative to /Users/me/.agents/skills/simplify.\n\n${body}\n</skill>`;

describe('parseSkillBlock', () => {
  it('parses a skill block without a trailing user message', () => {
    const parsed = parseSkillBlock(block('Do the thing.'));
    expect(parsed).toEqual({
      name: 'simplify',
      location: '/Users/me/.agents/skills/simplify/SKILL.md',
      content: 'References are relative to /Users/me/.agents/skills/simplify.\n\nDo the thing.'
    });
  });

  it('captures the trailing user message', () => {
    const parsed = parseSkillBlock(`${block('Body.')}\n\nclean up the diff`);
    expect(parsed?.userMessage).toBe('clean up the diff');
    expect(parsed?.name).toBe('simplify');
  });

  it('omits an empty user message', () => {
    const parsed = parseSkillBlock(`${block('Body.')}\n\n   `);
    expect(parsed?.userMessage).toBeUndefined();
  });

  it('returns null for plain text', () => {
    expect(parseSkillBlock('just a normal message')).toBeNull();
    expect(parseSkillBlock('<skill name="x">missing location</skill>')).toBeNull();
  });
});
