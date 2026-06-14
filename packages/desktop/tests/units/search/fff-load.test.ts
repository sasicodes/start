import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { logger } from '@main/utils/logger';

vi.mock('@ff-labs/fff-node', () => {
  throw new Error('native module missing');
});

let workspacePath = '';

beforeEach(() => {
  workspacePath = mkdtempSync(path.join(tmpdir(), 'start-fff-load-'));
  vi.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  const { disposeWorkspaceFinders } = await import('@main/search/finder');
  disposeWorkspaceFinders();
  rmSync(workspacePath, { recursive: true, force: true });
  vi.restoreAllMocks();
});

it('logs and degrades to null when the native addon fails to load', async () => {
  const { workspaceFinder } = await import('@main/search/finder');

  await expect(workspaceFinder(workspacePath)).resolves.toBeNull();
  expect(logger.error).toHaveBeenCalledWith('fff load', expect.any(Error));
});
