import { SubagentNameAllocator } from '@main/subagents/allocator';
import { subagentAvatar, subagentPalettes } from '@main/subagents/avatar';
import { subagentNames } from '@main/subagents/names';
import { describe, expect, it } from 'vitest';

describe('sub-agent identity', () => {
  it('assigns unique names before reusing the pool with suffixes', () => {
    const allocator = new SubagentNameAllocator();
    const names = Array.from({ length: subagentNames.length }, (_item, index) => allocator.next(`task-${index}`));

    expect(new Set(names).size).toBe(subagentNames.length);

    const extraName = allocator.next('overflow');
    expect(names).not.toContain(extraName);
    expect(extraName).toMatch(/-\d+$/);
  });

  it('generates stable pixel avatars from names', () => {
    expect(subagentAvatar('Arul')).toBe(subagentAvatar('Arul'));
    expect(subagentAvatar('Arul')).not.toBe(subagentAvatar('Mei'));
    expect(subagentAvatar('Arul')).toContain('data:image/svg+xml');
  });

  it('keeps avatar palette colors unique', () => {
    const colors = subagentPalettes.flat();

    expect(new Set(colors).size).toBe(colors.length);
  });
});
