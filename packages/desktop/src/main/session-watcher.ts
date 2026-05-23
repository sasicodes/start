import { existsSync, mkdirSync, watch, type FSWatcher } from 'node:fs';
import path from 'node:path';
import { getAgentDir } from '@earendil-works/pi-coding-agent';

const sessionChangeDebounceMs = 120;

const sessionDirectoryName = (cwd: string) => `--${cwd.replace(/^[/\\]/, '').replace(/[/\\:]/g, '-')}--`;

const workspaceSessionDirectory = (cwd: string) => path.join(getAgentDir(), 'sessions', sessionDirectoryName(cwd));

export class WorkspaceSessionWatcher {
  private cwd: string | undefined;
  private timer: NodeJS.Timeout | undefined;
  private watcher: FSWatcher | undefined;

  watch(cwd: string, onChange: (workspacePath: string) => void): void {
    if (this.cwd === cwd && this.watcher) return;

    this.close();
    this.cwd = cwd;

    const sessionDirectory = workspaceSessionDirectory(cwd);
    if (!existsSync(sessionDirectory)) mkdirSync(sessionDirectory, { recursive: true });

    try {
      this.watcher = watch(sessionDirectory, { persistent: false }, (_event, filename) => {
        if (filename && !filename.toString().endsWith('.jsonl')) return;
        this.schedule(onChange);
      });
      this.watcher.on('error', () => this.close());
    } catch {
      this.close();
    }
  }

  close(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.watcher?.close();
    this.watcher = undefined;
    this.cwd = undefined;
  }

  private schedule(onChange: (workspacePath: string) => void): void {
    const cwd = this.cwd;
    if (!cwd) return;

    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      onChange(cwd);
    }, sessionChangeDebounceMs);
  }
}
