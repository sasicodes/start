import { defaultHarness } from '@main/harness/default';
import { parseHarnessFile } from '@main/harness/discover';
import { harnessNameError, isReservedHarnessName, isValidHarnessName } from '@main/harness/validate';
import { buildStartSystemPrompt, replaceHarnessIntro, runtimeContextBlock } from '@main/prompt/index';
import { describe, expect, it } from 'vitest';

describe('harness validate', () => {
  it('accepts kebab-case names and rejects reserved and malformed ones', () => {
    expect(isValidHarnessName('research-mode')).toBe(true);
    expect(isValidHarnessName('default')).toBe(false);
    expect(isValidHarnessName('Research')).toBe(false);
    expect(isValidHarnessName('a--b')).toBe(false);
    expect(isReservedHarnessName('DEFAULT')).toBe(true);
  });

  it('returns precise error messages', () => {
    expect(harnessNameError('')).toContain('required');
    expect(harnessNameError('default')).toContain('reserved');
    expect(harnessNameError('Bad Name')).toContain('kebab-case');
    expect(harnessNameError('good-name')).toBe('');
  });
});

describe('parseHarnessFile', () => {
  it('reads frontmatter description and body', () => {
    const harness = parseHarnessFile(
      'research.md',
      '---\nname: research\ndescription: Deep research.\n---\nYou research.'
    );
    expect(harness).toEqual({ name: 'research', description: 'Deep research.', body: 'You research.' });
  });

  it('falls back to a generated description and rejects empty bodies', () => {
    expect(parseHarnessFile('writer.md', 'Just a body')?.description).toBe('Custom harness "writer".');
    expect(parseHarnessFile('writer.md', '---\nname: writer\n---\n')).toBeNull();
    expect(parseHarnessFile('default.md', 'reserved body')).toBeNull();
  });
});

describe('prompt harness composition', () => {
  it('swaps the persona intro while keeping scaffolding', () => {
    const base = buildStartSystemPrompt('/p', '/s');
    const swapped = replaceHarnessIntro(base, 'You are a research assistant.');
    expect(swapped).toContain('You are a research assistant.');
    expect(swapped).toContain('Available tools:');
    expect(swapped).toContain('Project and user resources:');
    expect(swapped).not.toContain(defaultHarness.body);
  });

  it('keeps default output byte-identical when body is the default', () => {
    const base = buildStartSystemPrompt('/p', '/s');
    expect(buildStartSystemPrompt('/p', '/s', undefined, defaultHarness.body)).toBe(base);
  });

  it('renders timezone and local time for runtime context', () => {
    const block = runtimeContextBlock(new Date('2026-07-05T12:00:00Z'));
    expect(block).toContain('User timezone:');
    expect(block).toContain('User local time:');
  });
});
