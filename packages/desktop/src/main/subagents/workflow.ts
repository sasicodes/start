import { randomUUID } from 'node:crypto';
import type { SubagentRunResult, SubagentRunSnapshot } from '@main/subagents/types';
import { subagentResults } from '@main/subagents/utils/progress';

export class Workflow {
  readonly id = randomUUID();
  readonly controller = new AbortController();
  private snapshot: SubagentRunSnapshot = { agents: [] };
  private readonly listeners = new Set<() => void>();
  private done = false;
  private revision = 0;
  private error = '';

  constructor(
    start: (signal: AbortSignal, update: (snapshot: SubagentRunSnapshot) => void) => Promise<SubagentRunResult>,
    lifetime: AbortSignal
  ) {
    const abort = () => this.controller.abort();
    lifetime.addEventListener('abort', abort, { once: true });
    if (lifetime.aborted) abort();
    const run = async () => {
      try {
        this.snapshot = await start(this.controller.signal, (snapshot) => {
          const changed = snapshot.agents.some(
            (agent, index) =>
              agent.status !== this.snapshot.agents[index]?.status &&
              agent.status !== 'running' &&
              agent.status !== 'queued'
          );
          this.snapshot = snapshot;
          if (changed) this.revision += 1;
          this.notify();
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Workflow failed.';
        this.error = reason;
        this.snapshot = {
          agents: this.snapshot.agents.map((agent) =>
            agent.status === 'running' || agent.status === 'queued'
              ? { ...agent, status: 'failed', summary: reason }
              : agent
          )
        };
      } finally {
        this.done = true;
        lifetime.removeEventListener('abort', abort);
        this.notify();
      }
    };
    run();
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  get running() {
    return (
      !this.done &&
      (this.snapshot.agents.length === 0 ||
        this.snapshot.agents.some((agent) => agent.status === 'running' || agent.status === 'queued'))
    );
  }

  result() {
    const guidance = this.running
      ? 'Some agents are still running. Silence is not a failure. Use wait_workflow with this workflowId to wait or check status; use cancel_workflow only when stopping the work is appropriate. Collect all results before finishing; address failed or cancelled tasks explicitly.'
      : 'Workflow ended. Inspect each status and address failed or cancelled tasks; partial responses are not completed work.';
    return {
      ...this.snapshot,
      workflowId: this.id,
      running: this.running,
      text: `Workflow ID: ${this.id}\n${guidance}${this.error ? `\nWorkflow error: ${this.error}` : ''}\n\n${subagentResults(this.snapshot.agents)}`
    };
  }

  async wait(waitMs: number, signal?: AbortSignal, update?: (snapshot: SubagentRunSnapshot) => void) {
    if (!this.running || waitMs === 0) return this.result();
    update?.(this.snapshot);
    const revision = this.revision;
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        this.listeners.delete(changed);
        signal?.removeEventListener('abort', finish);
        resolve();
      };
      const changed = () => {
        update?.(this.snapshot);
        if (!this.running || this.revision !== revision) finish();
      };
      const timer = setTimeout(finish, waitMs);
      this.listeners.add(changed);
      signal?.addEventListener('abort', finish, { once: true });
      if (signal?.aborted) finish();
    });
    return this.result();
  }
}
