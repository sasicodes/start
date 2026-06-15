import { defineTool } from '@earendil-works/pi-coding-agent';
import { positiveLimit } from '@main/providers/tools/fff/bounds';
import { toolResult } from '@main/providers/tools/result';
import { truncate } from '@main/utils/text';

export interface SessionEnvironment {
  type: 'local' | 'worktree';
  branch?: string;
}

export interface SessionSummary {
  id: string;
  status: string;
  isolated: boolean;
  workspacePath: string;
}

export interface SessionTurn {
  role: string;
  text: string;
}

export interface SessionController {
  list(): SessionSummary[];
  send(id: string, prompt: string): void;
  read(id: string): SessionTurn[] | null;
  create(input: { prompt: string; environment: SessionEnvironment }): Promise<SessionSummary>;
}

const defaultListLimit = 30;
const maxListLimit = 100;
const defaultTurnLimit = 20;
const maxTurnLimit = 100;
const defaultTurnChars = 2000;
const maxTurnChars = 8000;

const formatSessions = (sessions: readonly SessionSummary[]) => {
  if (sessions.length === 0) return 'No sessions.';
  return sessions
    .map(
      (session) => `${session.id} [${session.status}]${session.isolated ? ' (worktree)' : ''} ${session.workspacePath}`
    )
    .join('\n');
};

const formatTurns = (turns: readonly SessionTurn[], maxChars: number) => {
  if (turns.length === 0) return 'No messages yet.';
  return turns.map((turn) => `${turn.role}: ${truncate(turn.text, maxChars)}`).join('\n\n');
};

interface CreateArgs {
  prompt: string;
  environment?: SessionEnvironment;
}

export const runCreateSession = async (controller: SessionController, { prompt, environment }: CreateArgs) => {
  if (!prompt.trim()) return toolResult('Provide a non-empty prompt.', null);
  const env: SessionEnvironment = environment ?? { type: 'local' };
  const session = await controller.create({ prompt, environment: env });
  const message =
    env.type === 'worktree' && !session.isolated
      ? `Could not isolate a worktree (not a git repository or git failed). Started a local session ${session.id} at ${session.workspacePath} instead.`
      : `Created ${session.isolated ? 'worktree' : 'local'} session ${session.id} at ${session.workspacePath}`;
  return toolResult(message, null);
};

export const runListSessions = (
  controller: SessionController,
  { query, limit }: { query?: string; limit?: number }
) => {
  const sessions = controller.list();
  const matched = query
    ? sessions.filter((session) => session.id.includes(query) || session.workspacePath.includes(query))
    : sessions;
  return toolResult(
    formatSessions(matched.slice(0, positiveLimit(limit ?? null, defaultListLimit, maxListLimit))),
    null
  );
};

interface ReadArgs {
  id: string;
  turnLimit?: number;
  maxOutputCharsPerItem?: number;
}

export const runReadSession = (controller: SessionController, { id, turnLimit, maxOutputCharsPerItem }: ReadArgs) => {
  const turns = controller.read(id);
  if (!turns) return toolResult(`No session found for ${id}.`, null);
  const recent = turns.slice(-positiveLimit(turnLimit ?? null, defaultTurnLimit, maxTurnLimit));
  return toolResult(
    formatTurns(recent, positiveLimit(maxOutputCharsPerItem ?? null, defaultTurnChars, maxTurnChars)),
    null
  );
};

export const runSendMessage = (controller: SessionController, { id, prompt }: { id: string; prompt: string }) => {
  if (!prompt.trim()) return toolResult('Provide a non-empty message.', null);
  if (!controller.list().some((session) => session.id === id)) return toolResult(`No session found for ${id}.`, null);
  controller.send(id, prompt);
  return toolResult(`Message sent to session ${id}.`, null);
};

const createParameters = {
  type: 'object',
  required: ['prompt'],
  additionalProperties: false,
  properties: {
    prompt: { type: 'string', description: 'First message for the new session.' },
    environment: {
      type: 'object',
      required: ['type'],
      additionalProperties: false,
      description: 'Where the session runs. Omit for a local session in the current workspace.',
      properties: {
        type: {
          type: 'string',
          enum: ['local', 'worktree'],
          description: 'local: the current workspace. worktree: an isolated branch and directory.'
        },
        branch: {
          type: 'string',
          description: 'Base branch for a worktree session. Defaults to the current HEAD.'
        }
      }
    }
  }
} as const;

const listParameters = {
  type: 'object',
  additionalProperties: false,
  properties: {
    query: { type: 'string', description: 'Filter by session id or workspace path.' },
    limit: { type: 'number', description: 'Maximum sessions to return.' }
  }
} as const;

const readParameters = {
  type: 'object',
  required: ['id'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', description: 'Session id to read.' },
    turnLimit: { type: 'number', description: 'How many of the most recent turns to include.' },
    maxOutputCharsPerItem: { type: 'number', description: 'Maximum characters per turn.' }
  }
} as const;

const sendParameters = {
  type: 'object',
  required: ['id', 'prompt'],
  additionalProperties: false,
  properties: {
    id: { type: 'string', description: 'Session id to message.' },
    prompt: { type: 'string', description: 'Message to send.' }
  }
} as const;

export const createSessionTools = ({ sessions }: { sessions: SessionController }) => [
  defineTool({
    name: 'create_session',
    label: 'create session',
    parameters: createParameters,
    description: 'Start a new parallel session for a task. It runs in the background and does not take focus.',
    promptSnippet: 'Start a parallel session, optionally isolated in a worktree.',
    execute: (_toolCallId, args) => runCreateSession(sessions, args)
  }),
  defineTool({
    name: 'list_sessions',
    label: 'list sessions',
    parameters: listParameters,
    description: 'List sessions with their status and workspace.',
    promptSnippet: 'List sessions with status and workspace.',
    execute: async (_toolCallId, args) => runListSessions(sessions, args)
  }),
  defineTool({
    name: 'read_session',
    label: 'read session',
    parameters: readParameters,
    description: 'Read the most recent turns of a session.',
    promptSnippet: 'Read recent messages from a session.',
    execute: async (_toolCallId, args) => runReadSession(sessions, args)
  }),
  defineTool({
    name: 'send_message_to_session',
    label: 'send to session',
    parameters: sendParameters,
    description: 'Send a message to a session by id.',
    promptSnippet: 'Send a message to a session.',
    execute: async (_toolCallId, args) => runSendMessage(sessions, args)
  })
];
