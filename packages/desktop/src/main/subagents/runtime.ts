import {
  SessionManager,
  type AuthStorage,
  type AgentSession,
  createAgentSession,
  type ModelRegistry,
  type ToolDefinition,
  type SettingsManager
} from '@earendil-works/pi-coding-agent';
import { randomUUID } from 'node:crypto';
import { agentEndError } from '@main/helpers';
import { createStartResourceLoader } from '@main/prompt/loader';
import type { SubagentNameAllocator } from '@main/subagents/allocator';
import { subagentAccentColor, subagentAvatar } from '@main/subagents/avatar';
import type { SubagentRunResult, SubagentTaskInput, SubagentRunSnapshot } from '@main/subagents/types';
import { countLabel } from '@main/details';
import type { EffortLevel, SubagentActivity } from '@main/types';

const maxConcurrentAgents = 4;
const subagentTimeoutMs = 10 * 60 * 1000;

interface RunSubagentsOptions {
  cwd: string;
  signal?: AbortSignal;
  authStorage: AuthStorage;
  tasks: SubagentTaskInput[];
  thinkingLevel: EffortLevel;
  modelRegistry: ModelRegistry;
  settingsManager: SettingsManager;
  customTools: () => ToolDefinition[];
  nameAllocator: SubagentNameAllocator;
  onUpdate: (snapshot: SubagentRunSnapshot) => void;
  model: ModelRegistry['getAvailable'] extends () => Array<infer ModelItem> ? ModelItem : never;
}

const resultText = (agents: SubagentActivity[]) =>
  agents
    .map((agent) => {
      const heading = `From ${agent.name}`;
      const summary = agent.summary ? `\n${agent.summary}` : '';
      return `## ${heading}\nTask: ${agent.task}${summary}`;
    })
    .join('\n\n');

const finalPrompt = (task: string) =>
  `You are a sub-agent working on one focused part of the parent agent's request.

Task:
${task}

Work independently. Keep your final answer concise and useful to the parent agent. Include concrete file paths, findings, and blockers when relevant.`;

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

const runWithTimeout = async (session: AgentSession, signal: AbortSignal | null, task: string) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    await Promise.race([
      runWithAbort(session, signal, task),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          rejectAfterAbort(session, new Error('Sub-agent timed out.'), reject);
        }, subagentTimeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const runSubagents = async ({
  cwd,
  model,
  tasks,
  signal,
  onUpdate,
  authStorage,
  customTools,
  modelRegistry,
  nameAllocator,
  thinkingLevel,
  settingsManager
}: RunSubagentsOptions): Promise<SubagentRunResult> => {
  const agents: SubagentActivity[] = tasks.map((task, index) => {
    const name = nameAllocator.next(`${task.prompt}:${index}:${randomUUID()}`);
    return {
      name,
      id: randomUUID(),
      status: 'queued',
      task: task.prompt,
      avatar: subagentAvatar(name),
      accentColor: subagentAccentColor(name)
    };
  });

  const update = () => onUpdate({ agents: agents.map((agent) => ({ ...agent })) });
  let nextIndex = 0;
  update();

  const runNext = async (): Promise<void> => {
    const index = nextIndex;
    nextIndex += 1;
    const agent = agents[index];
    if (!agent) return;

    let session: AgentSession | null = null;
    try {
      agent.status = 'running';
      update();

      const sessionManager = SessionManager.inMemory(cwd);
      const resourceLoader = await createStartResourceLoader(cwd);
      const result = await createAgentSession({
        cwd,
        model,
        authStorage,
        modelRegistry,
        thinkingLevel,
        sessionManager,
        resourceLoader,
        customTools: customTools(),
        settingsManager
      });
      session = result.session;
      session.setActiveToolsByName(session.getAllTools().map(({ name }) => name));

      let endError = '';
      const unsubscribe = session.subscribe((event) => {
        const error = agentEndError(event);
        if (error) endError = error;
      });

      try {
        await runWithTimeout(session, signal ?? null, agent.task);
      } finally {
        unsubscribe();
      }

      if (endError) throw new Error(endError);

      agent.status = 'completed';
      agent.summary = session.getLastAssistantText().trim() || 'No summary returned.';
      update();
    } catch (error) {
      agent.status = signal?.aborted ? 'cancelled' : 'failed';
      agent.summary = error instanceof Error ? error.message : 'Sub-agent failed.';
      update();
    } finally {
      try {
        session?.dispose();
      } finally {
        await runNext();
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(maxConcurrentAgents, agents.length) }, () => runNext()));

  return {
    text: `${countLabel(agents.length, 'sub-agent')} finished.\n\n${resultText(agents)}`,
    agents
  };
};
