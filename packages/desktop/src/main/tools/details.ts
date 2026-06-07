import { countLabel, isRecord, numberValue, stringValue, textContent } from '@main/details';
import { subagentActivityList, subagentTaskCount } from '@main/subagents/activity';
import type { ChatEvent, TurnDetailState } from '@main/types';

const recordPath = (args: Record<string, unknown>) => stringValue(args.path) || '.';

const browserToolTitles: Record<string, { active: string; done: string; error: string; result: string }> = {
  browser_back: {
    done: 'Went back',
    error: 'Back failed',
    active: 'Going back',
    result: 'Went back'
  },
  browser_open: {
    done: 'Opened Browser',
    error: 'Open failed',
    active: 'Opening Browser',
    result: 'Opened Browser'
  },
  browser_type: {
    done: 'Typed Browser',
    error: 'Type failed',
    active: 'Typing Browser',
    result: 'Typed Browser'
  },
  browser_click: {
    done: 'Clicked Browser',
    error: 'Click failed',
    active: 'Clicking Browser',
    result: 'Clicked Browser'
  },
  browser_press: {
    done: 'Pressed Browser',
    error: 'Press failed',
    active: 'Pressing Browser',
    result: 'Pressed Browser'
  },
  browser_reload: {
    done: 'Reloaded Browser',
    error: 'Reload failed',
    active: 'Reloading Browser',
    result: 'Reloaded Browser'
  },
  browser_status: {
    done: 'Checked Browser',
    error: 'Check failed',
    active: 'Checking Browser',
    result: 'Checked Browser'
  },
  browser_forward: {
    done: 'Went forward',
    error: 'Forward failed',
    active: 'Going forward',
    result: 'Went forward'
  },
  browser_snapshot: {
    done: 'Read Browser',
    error: 'Read failed',
    active: 'Reading Browser',
    result: 'Read Browser'
  },
  browser_screenshot: {
    done: 'Captured Browser',
    error: 'Capture failed',
    active: 'Capturing Browser',
    result: 'Captured Browser'
  }
};

const fileLanguages: Record<string, string> = {
  c: 'c',
  h: 'c',
  go: 'go',
  js: 'js',
  md: 'md',
  py: 'py',
  ts: 'ts',
  css: 'css',
  csv: 'csv',
  html: 'html',
  java: 'java',
  json: 'json',
  jsx: 'jsx',
  rs: 'rust',
  sh: 'sh',
  tsx: 'tsx',
  txt: 'text',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml'
};

const fileLanguage = (path: string) => {
  const name = path.split(/[\\/]/).pop() ?? path;
  if (name === 'Dockerfile') return 'dockerfile';
  if (name === 'Makefile') return 'makefile';
  if (name.endsWith('.d.ts')) return 'ts';

  const extension = name.includes('.') ? (name.split('.').pop() ?? '').toLowerCase() : '';
  return fileLanguages[extension] ?? 'text';
};

const longestFenceLength = (value: string) =>
  (value.match(/`{3,}/g) ?? []).reduce((length, fence) => Math.max(length, fence.length), 2);

export const codeBlock = (value: string, language = 'text') => {
  const content = value.replace(/\n+$/g, '');
  const fence = '`'.repeat(longestFenceLength(content) + 1);
  const label = language.replace(/[^\w.+-]/g, '') || 'text';
  return `${fence}${label}\n${content}\n${fence}`;
};

const trailingNoticePattern = /\n\n(\[[^\n]+\])$/;

const codeOutput = (value: string, language = 'text') => {
  const content = value.replace(/\n+$/g, '');
  const notice = trailingNoticePattern.exec(content);
  if (!notice?.[1]) return codeBlock(content, language);

  const body = content.slice(0, notice.index);
  return [body ? codeBlock(body, language) : '', notice[1]].filter(Boolean).join('\n\n');
};

const plainToolOutput = (toolName: string, content: string) => {
  const text = content.trim();
  if (!text) return true;
  if (toolName === 'bash' && text === '(no output)') return true;
  if (toolName === 'edit' && text.startsWith('Successfully replaced')) return true;
  if (toolName === 'find' && text === 'No files found matching pattern') return true;
  if (toolName === 'grep' && text === 'No matches found') return true;
  if (toolName === 'ls' && text === '(empty directory)') return true;
  if (toolName === 'read' && text.startsWith('Read image file')) return true;
  if (toolName === 'write' && text.startsWith('Successfully wrote')) return true;
  return false;
};

const toolOutput = (toolName: string, args: Record<string, unknown>, content: string) => {
  if (!content) return '';
  if (plainToolOutput(toolName, content)) return content;
  if (toolName === 'bash') return codeOutput(content, 'bash');
  if (toolName === 'read') return codeOutput(content, fileLanguage(recordPath(args)));
  return content;
};

const diffMarkdown = (details: unknown) => {
  if (!isRecord(details)) return '';

  const diff = stringValue(details.diff);
  return diff ? codeBlock(diff, 'diff') : '';
};

export const toolBody = (toolName: string, args: Record<string, unknown>, result: unknown) => {
  if (toolName === 'subagent_spawn') return '';
  if (!isRecord(result)) return '';

  const output = toolOutput(toolName, args, textContent(result.content));
  const diff = toolName === 'edit' ? diffMarkdown(result.details) : '';
  if (diff && output.startsWith('Successfully replaced')) return diff;
  return [output, diff].filter(Boolean).join('\n\n').trim();
};

const toolDetail = (toolName: string, args: Record<string, unknown>) => {
  if (toolName === 'web_search') return stringValue(args.query);
  if (toolName === 'browser_open') return stringValue(args.url);
  if (toolName.startsWith('browser_')) return '';
  if (toolName === 'subagent_spawn') return '';
  if (toolName === 'bash') return stringValue(args.command).replace(/\s+/g, ' ').trim();
  if (toolName === 'find') return stringValue(args.pattern);
  if (toolName === 'grep') return stringValue(args.pattern);
  return recordPath(args);
};

const diffStats = (details: unknown) => {
  if (!isRecord(details)) return '';

  const diff = stringValue(details.diff);
  if (!diff) return '';

  let added = 0;
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added += 1;
    if (line.startsWith('-')) removed += 1;
  }

  return added > 0 || removed > 0 ? `+${added} -${removed}` : '';
};

const toolMetric = (toolName: string, args: Record<string, unknown>, result?: unknown) => {
  if (toolName === 'subagent_spawn') return '';
  if (toolName === 'web_search' && isRecord(result) && isRecord(result.details)) {
    const resultCount = result.details.resultCount;
    return typeof resultCount === 'number' ? countLabel(resultCount, 'result') : '';
  }
  if (toolName === 'edit') {
    const stats = isRecord(result) ? diffStats(result.details) : '';
    const changes = Array.isArray(args.edits) ? countLabel(args.edits.length, 'change') : '';
    return [changes, stats].filter(Boolean).join(', ');
  }
  if (toolName === 'write') return countLabel(stringValue(args.content).length, 'byte');
  if (toolName === 'read' && numberValue(args.limit) > 0) return countLabel(numberValue(args.limit), 'line');
  return '';
};

export const keepsErrorState = (toolName: string) => toolName === 'subagent_spawn' || toolName.startsWith('browser_');

export const toolResultTitle = (toolName: string, error: boolean) => {
  if (toolName === 'subagent_spawn') return error ? 'Sub-agents failed' : 'Sub-agents finished';

  const browserTitle = browserToolTitles[toolName];
  if (browserTitle) return error ? browserTitle.error : browserTitle.result;

  if (toolName === 'bash') return 'Ran command';
  if (toolName === 'web_search') return 'Searched the web';
  if (toolName === 'edit') return 'Edited file';
  if (toolName === 'find') return 'Found files';
  if (toolName === 'grep') return 'Searched code';
  if (toolName === 'ls') return 'Explored folder';
  if (toolName === 'read') return 'Read file';
  if (toolName === 'write') return 'Created file';
  return `Used ${toolName}`;
};

const toolTitle = (toolName: string, args: Record<string, unknown>, state: TurnDetailState) => {
  if (toolName === 'subagent_spawn') {
    const count = countLabel(subagentTaskCount(args), 'agent');
    if (state === 'error') return 'Sub-agents failed';
    return state === 'active' ? `Spawning ${count}` : `Finished ${count}`;
  }

  const browserTitle = browserToolTitles[toolName];
  if (browserTitle) {
    if (state === 'error') return browserTitle.error;
    return state === 'active' ? browserTitle.active : browserTitle.done;
  }

  const path = recordPath(args);
  const command = toolDetail(toolName, args);
  const pattern = stringValue(args.pattern);

  if (toolName === 'bash')
    return command
      ? `${state === 'active' ? 'Running' : 'Ran'} command ${command}`
      : `${state === 'active' ? 'Running' : 'Ran'} command`;
  if (toolName === 'edit') return `${state === 'active' ? 'Editing' : 'Edited'} ${path}`;
  if (toolName === 'find')
    return `${state === 'active' ? 'Finding' : 'Found'} files${pattern ? ` matching ${pattern}` : ''}`;
  if (toolName === 'grep')
    return `${state === 'active' ? 'Searching' : 'Searched'} code${pattern ? ` for ${pattern}` : ''}`;
  if (toolName === 'web_search')
    return `${state === 'active' ? 'Searching' : 'Searched'} the web${command ? ` for ${command}` : ''}`;
  if (toolName === 'ls') return `${state === 'active' ? 'Exploring' : 'Explored'} folder ${path}`;
  if (toolName === 'read') return `${state === 'active' ? 'Reading' : 'Read'} ${path}`;
  if (toolName === 'write') return `${state === 'active' ? 'Creating' : 'Created'} ${path}`;
  return `${state === 'active' ? 'Using' : 'Used'} ${toolName}`;
};

export const toolEventDetail = ({
  key,
  args,
  state,
  result,
  toolName
}: {
  key: string;
  args: unknown;
  state: TurnDetailState;
  result?: unknown;
  toolName: string;
}): ChatEvent => {
  const safeArgs = isRecord(args) ? args : {};
  const detail = toolDetail(toolName, safeArgs);
  const metric = toolMetric(toolName, safeArgs, result);
  const body = toolBody(toolName, safeArgs, result);
  const nextState = state === 'error' && !keepsErrorState(toolName) ? 'done' : state;
  const event: ChatEvent = {
    key,
    state: nextState,
    kind: nextState === 'error' ? 'error' : 'tool',
    title: toolTitle(toolName, safeArgs, nextState)
  };

  if (body) event.body = body;
  if (detail) event.detail = detail;
  if (metric) event.metric = metric;
  const subagents = subagentActivityList(result);
  if (subagents.length > 0) event.subagents = subagents;
  return event;
};
