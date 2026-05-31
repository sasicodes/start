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
  `You are a sub-agent handling one focused task for the parent agent.

Task:
${task}

Work independently. Return only what the task asks for: concrete findings, file paths, and blockers. Be precise and brief — no preamble, no restating the task, nothing outside its scope.`;

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
  update();

  const runAgent = async (agent: SubagentActivity): Promise<void> => {
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
        await runWithAbort(session, signal ?? null, agent.task);
      } finally {
        unsubscribe();
      }

      if (endError) throw new Error(endError);

      agent.status = 'completed';
      agent.summary = (session.getLastAssistantText() || 'No summary returned.').trim();
      update();
    } catch (error) {
      agent.status = signal?.aborted ? 'cancelled' : 'failed';
      agent.summary = error instanceof Error ? error.message : 'Sub-agent failed.';
      update();
    } finally {
      session?.dispose();
    }
  };

  await Promise.all(agents.map((agent) => runAgent(agent)));

  return {
    text: `${countLabel(agents.length, 'sub-agent')} finished.\n\n${resultText(agents)}`,
    agents
  };
};
