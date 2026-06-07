import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { freshChatService } from '../helpers/chat-service.js';

const execFileAsync = promisify(execFile);

describe('mobile workspace metadata', () => {
  let workspacePath = '';

  afterEach(async () => {
    if (workspacePath) await rm(workspacePath, { recursive: true, force: true });
    workspacePath = '';
  });

  it('includes the active git branch in the mobile session index workspace', async () => {
    workspacePath = await mkdtemp(join(tmpdir(), 'start-mobile-workspace-'));
    await execFileAsync('git', ['init', '-b', 'mobile-branch'], { cwd: workspacePath });

    const chat = freshChatService({ lastWorkspace: workspacePath });
    const index = await chat.getMobileSessionIndex();

    expect(index.workspace.path).toBe(workspacePath);
    expect(index.workspace.branchName).toBe('mobile-branch');
  });
});
