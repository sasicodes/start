import { parseSkillBlock, skillCommandText } from '@renderer/shared/skill/parse';
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

describe('skillCommandText', () => {
  it('reconstructs the slash command the user typed', () => {
    const withMessage = parseSkillBlock(`${block('Body.')}\n\nWhat is this?`);
    expect(withMessage && skillCommandText(withMessage)).toBe('/skill:simplify What is this?');
  });

  it('reconstructs a bare skill command when no message follows', () => {
    const bare = parseSkillBlock(block('Body.'));
    expect(bare && skillCommandText(bare)).toBe('/skill:simplify');
  });
});
