export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  added?: string[];
  improved?: string[];
  fixed?: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.0-alpha.121',
    date: 'April 14, 2026',
    title: 'Scheduled Jobs & Cron Triggers',
    added: [
      'Scheduled jobs panel: create, edit, and manage recurring agent tasks on a cron schedule',
      'Remote triggers API for running agents from external services'
    ],
    improved: ['Job history now shows execution duration and exit status'],
    fixed: ['Jobs panel no longer flickers when switching between chat and jobs tabs']
  },
  {
    version: '0.1.0-alpha.118',
    date: 'April 10, 2026',
    title: 'Daily Logs & Memory',
    added: [
      'Daily log tool: agents can append timestamped notes to a per-project daily log',
      'Project memory persistence: agents remember conventions and decisions across sessions'
    ],
    improved: ['Memory is now scoped per project, not global'],
    fixed: ['ReadMemory no longer returns stale content after switching projects']
  },
  {
    version: '0.1.0-alpha.108',
    date: 'March 28, 2026',
    title: 'Codebase Indexing',
    added: [
      'Background file indexer: builds a searchable index of symbols, imports, and file metadata',
      'SearchSymbols tool for finding function, class, and type definitions instantly',
      'GetCodebaseBrief returns a ranked summary of every file with dependency edges'
    ],
    improved: ['Incremental reindexing: only changed files are re-processed after git operations'],
    fixed: ['Index failures on individual files no longer abort the entire batch']
  },
  {
    version: '0.1.0-alpha.101',
    date: 'March 20, 2026',
    title: 'PR Review & Git Integration',
    added: [
      'Pull request review tab: view diffs, comments, and CI status inline',
      'Git changes panel in the right sidebar with staged/unstaged file grouping'
    ],
    improved: ['Diff viewer now supports syntax highlighting for 40+ languages'],
    fixed: ['Branch switching no longer leaves stale file tree entries']
  },
  {
    version: '0.1.0-alpha.94',
    date: 'March 12, 2026',
    title: 'Split Terminal',
    added: [
      'Split terminal panel in the right sidebar: run commands alongside the agent',
      'Terminal output is readable by agents via GetTerminalOutput tool'
    ],
    improved: ['Terminal resizes smoothly with the sidebar drag handle'],
    fixed: ['Terminal process cleanup on window close prevents zombie shells']
  },
  {
    version: '0.1.0-alpha.87',
    date: 'March 3, 2026',
    title: 'Kanban Tasks',
    added: [
      'Task board with drag-and-drop columns: todo, in progress, done',
      'Agents can create, update, and read tasks via dedicated tools'
    ],
    improved: ['Tasks persist across sessions in SQLite with cursor-based pagination'],
    fixed: ['Task priority dots now render correctly on high-DPI displays']
  },
  {
    version: '0.1.0-alpha.80',
    date: 'February 22, 2026',
    title: 'Autopilot Mode',
    added: [
      'Autopilot toggle: let the agent run multi-step tasks without manual approval',
      'Permission sandboxing for file writes and bash commands in autopilot'
    ],
    improved: ['Tool execution feedback now streams in real time'],
    fixed: ['Autopilot no longer hangs when the agent requests user input mid-chain']
  },
  {
    version: '0.1.0-alpha.72',
    date: 'February 12, 2026',
    title: 'File Explorer & Tabs',
    added: [
      'File tree explorer in the right sidebar with expand/collapse and file icons',
      'Tabbed center pane: open files, images, diffs, and plans as tabs'
    ],
    improved: ['Middle-truncated file names in tabs for long paths'],
    fixed: ['Opening the same file twice no longer creates duplicate tabs']
  },
  {
    version: '0.1.0-alpha.60',
    date: 'January 30, 2026',
    title: 'Initial Alpha',
    added: [
      'Three-panel workspace layout: tasks, chat, and explorer',
      'Chat panel with streaming responses and tool call rendering',
      'MCP tool server with filesystem, codebase, and browser tools',
      'Sidecar process architecture: Node.js bridge between Tauri and the agent SDK',
      'macOS native app shell with Tauri v2'
    ]
  }
];
