import { randomUUID } from 'node:crypto';
import {
  type AgentSession,
  createAgentSession,
  type ModelRuntime,
  SessionManager,
  type SettingsManager,
  type ToolDefinition
} from '@earendil-works/pi-coding-agent';
import { agentEndError, clampThinkingLevel } from '@main/helpers';
import { createStartResourceLoader } from '@main/prompt/loader';
import type { SubagentNameAllocator } from '@main/subagents/allocator';
import { subagentAccentColor, subagentAvatar } from '@main/subagents/avatar';
import type { ResolvedModel, SubagentRunResult, SubagentRunSnapshot, SubagentTaskInput } from '@main/subagents/types';
import { subagentProgress, subagentResults } from '@main/subagents/utils/progress';
import type { SubagentActivity } from '@main/types';

interface RunSubagentsOptions {
  cwd: string;
  signal?: AbortSignal;
  tasks: SubagentTaskInput[];
  modelRuntime: ModelRuntime;
  settingsManager: SettingsManager;
  customTools: () => ToolDefinition[];
  nameAllocator: SubagentNameAllocator;
  onUpdate: (snapshot: SubagentRunSnapshot) => void;
  resolveModel: (key: string) => ResolvedModel | null;
}

interface AgentJob {
  task: SubagentTaskInput;
  agent: SubagentActivity;
  model: ResolvedModel | null;
}

const maxConcurrentAgents = 4;

const finalPrompt = (task: string) =>
  `Complete the assigned task independently for the parent agent and stay within its scope.

Task:
${task}

Return the requested result. Where relevant, include findings or changes, supporting file paths, validation performed, and unresolved blockers. Keep the handoff concise, but preserve evidence the parent needs.`;

const abortSession = async (session: AgentSession) => {
  session.abortBash();
  await session.abort();
};

const rejectAfterAbort = (session: AgentSession, error: Error, reject: (reason?: unknown) => void) => {
  abortSession(session).then(
    () => reject(error),
    () => reject(error)
  );
};

const runWithAbort = async (session: AgentSession, signal: AbortSignal | null, task: string) => {
  if (!signal) {
    await session.prompt(finalPrompt(task));
    return;
  }

  if (signal.aborted) throw new Error('Sub-agent run cancelled.');

  let removeAbortListener = () => {};
  try {
    await Promise.race([
      session.prompt(finalPrompt(task)),
      new Promise<never>((_resolve, reject) => {
        const abort = () => {
          rejectAfterAbort(session, new Error('Sub-agent run cancelled.'), reject);
        };
        signal.addEventListener('abort', abort, { once: true });
        removeAbortListener = () => signal.removeEventListener('abort', abort);
      })
    ]);
  } finally {
    removeAbortListener();
  }
};

export const runSubagents = async ({
  cwd,
  tasks,
  signal,
  onUpdate,
  customTools,
  resolveModel,
  modelRuntime,
  nameAllocator,
  settingsManager
}: RunSubagentsOptions): Promise<SubagentRunResult> => {
  const jobs: AgentJob[] = tasks.map((task, index) => {
    const name = nameAllocator.next(`${task.prompt}:${index}:${randomUUID()}`);
    const model = resolveModel(task.model);
    return {
      task,
      model,
      agent: {
        name,
        id: randomUUID(),
        status: 'queued',
        task: task.prompt,
        effort: task.effort,
        avatar: subagentAvatar(name),
        model: model?.id ?? task.model,
        accentColor: subagentAccentColor(name)
      }
    };
  });
  const agents = jobs.map((job) => job.agent);

  const update = () => onUpdate({ agents: agents.map((agent) => ({ ...agent })) });
  update();

  const runAgent = async ({ task, agent, model }: AgentJob): Promise<void> => {
    let session: AgentSession | null = null;
    try {
      if (signal?.aborted) throw new Error('Sub-agent run cancelled.');
      if (!model) throw new Error('No configured model is available. Set up a provider in settings.');

      agent.status = 'running';
      agent.activity = 'Starting agent';
      agent.lastActivityAt = Date.now();
      update();

      const sessionManager = SessionManager.inMemory(cwd);
      const resourceLoader = await createStartResourceLoader(cwd);
      const result = await createAgentSession({
        cwd,
        model,
        modelRuntime,
        sessionManager,
        resourceLoader,
        customTools: customTools(),
        settingsManager,
        thinkingLevel: clampThinkingLevel(model, task.effort)
      });
      session = result.session;
      session.setActiveToolsByName(session.getAllTools().map(({ name }) => name));

      if (signal?.aborted) throw new Error('Sub-agent run cancelled.');
      agent.activity = 'Waiting for model response';
      agent.lastActivityAt = Date.now();
      update();
      let lastPublish = 0;
      let endError = '';
      const unsubscribe = session.subscribe((event) => {
        const activity = subagentProgress(event);
        if (activity) {
          const changed = agent.activity !== activity;
          agent.activity = activity;
          agent.lastActivityAt = Date.now();
          if (changed || agent.lastActivityAt - lastPublish >= 1000) {
            lastPublish = agent.lastActivityAt;
            update();
          }
        }
        const error = agentEndError(event);
        if (error) endError = error;
      });

      try {
        await runWithAbort(session, signal ?? null, agent.task);
      } finally {
        unsubscribe();
      }

      if (signal?.aborted) throw new Error('Sub-agent run cancelled.');
      if (endError) throw new Error(endError);

      agent.status = 'completed';
      agent.summary = (session.getLastAssistantText() || 'No summary returned.').trim();
      update();
    } catch (error) {
      agent.status = signal?.aborted ? 'cancelled' : 'failed';
      const reason = error instanceof Error ? error.message : 'Sub-agent failed.';
      const partial = session?.getLastAssistantText()?.trim().slice(0, 12000) ?? '';
      agent.summary = `${reason}${partial ? `\n\nPartial response:\n${partial}` : ''}`;
      update();
    } finally {
      session?.dispose();
    }
  };

  const pending = [...jobs];
  const worker = async () => {
    for (let job = pending.shift(); job; job = pending.shift()) await runAgent(job);
  };
  await Promise.all(Array.from({ length: Math.min(maxConcurrentAgents, jobs.length) }, worker));

  return {
    text: subagentResults(agents),
    agents
  };
};
