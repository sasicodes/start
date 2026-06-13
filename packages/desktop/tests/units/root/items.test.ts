import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { listRootItems } from '@main/root/items';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fffMock = vi.hoisted(() => ({
  searchWorkspacePaths: vi.fn()
}));

vi.mock('@main/search/fff', () => fffMock);

describe('root workspace items', () => {
  let workspacePath = '';

  beforeEach(() => {
    workspacePath = mkdtempSync(path.join(tmpdir(), 'start-root-items-'));
    fffMock.searchWorkspacePaths.mockReset();
  });

  afterEach(() => {
    rmSync(workspacePath, { recursive: true, force: true });
  });

  it('uses FFF results for searched workspace finder tokens', async () => {
    fffMock.searchWorkspacePaths.mockResolvedValue([
      { path: 'src/main/chat.ts', type: 'file' },
      { path: 'src/main', type: 'directory' }
    ]);

    const items = await listRootItems('src/ch', 'workspace', workspacePath);

    expect(fffMock.searchWorkspacePaths).toHaveBeenCalledWith({
      query: 'ch',
      folderPath: 'src',
      limit: 120,
      workspaceRoot: workspacePath
    });
    expect(items).toEqual([
      {
        name: 'chat.ts',
        type: 'file',
        path: 'src/main/chat.ts',
        description: 'src/main/chat.ts'
      },
      {
        name: 'main',
        type: 'directory',
        path: 'src/main',
        description: 'src/main'
      }
    ]);
  });

  it('falls back to git workspace search when FFF is unavailable', async () => {
    fffMock.searchWorkspacePaths.mockResolvedValue(null);
    mkdirSync(path.join(workspacePath, 'src'), { recursive: true });
    writeFileSync(path.join(workspacePath, 'src', 'chat.ts'), 'export const chat = true;\n');
    execFileSync('git', ['-C', workspacePath, 'init'], { stdio: 'ignore' });

    const items = await listRootItems('chat', 'workspace', workspacePath);

    expect(items).toEqual([
      {
        name: 'chat.ts',
        type: 'file',
        path: 'src/chat.ts',
        description: 'src/chat.ts'
      }
    ]);
  });

  it('does not call FFF for direct workspace folder listing', async () => {
    mkdirSync(path.join(workspacePath, 'src'), { recursive: true });
    writeFileSync(path.join(workspacePath, 'src', 'chat.ts'), 'export const chat = true;\n');
    execFileSync('git', ['-C', workspacePath, 'init'], { stdio: 'ignore' });

    const items = await listRootItems('', 'workspace', workspacePath);

    expect(fffMock.searchWorkspacePaths).not.toHaveBeenCalled();
    expect(items).toEqual([
      {
        name: 'src',
        path: 'src',
        type: 'directory'
      }
    ]);
  });
});
