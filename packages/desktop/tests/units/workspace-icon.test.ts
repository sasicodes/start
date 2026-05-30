import { describe, expect, it } from 'vitest';
import { generatedWorkspaceIconDataUrl } from '@main/workspace/icons';

describe('generatedWorkspaceIconDataUrl', () => {
  it('always returns a data URL for an svg gradient', () => {
    const dataUrl = generatedWorkspaceIconDataUrl('any-folder');
    expect(dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });

  it('is deterministic for the same folder name', () => {
    expect(generatedWorkspaceIconDataUrl('projects')).toBe(generatedWorkspaceIconDataUrl('projects'));
    expect(generatedWorkspaceIconDataUrl('home')).toBe(generatedWorkspaceIconDataUrl('home'));
  });

  it('produces different gradients for different names', () => {
    const a = generatedWorkspaceIconDataUrl('alpha');
    const b = generatedWorkspaceIconDataUrl('beta');
    expect(a).not.toBe(b);
  });

  it('decodes to a circle with two gradient stops', () => {
    const dataUrl = generatedWorkspaceIconDataUrl('start');
    const svg = Buffer.from(dataUrl.split(',')[1] ?? '', 'base64').toString('utf8');
    expect(svg).toContain('<circle');
    expect(svg.match(/stop-color="hsl\(/g)?.length).toBe(2);
  });
});
