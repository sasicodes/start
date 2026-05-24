export interface Tab {
  id: string;
  label: string;
  title: string;
  image: string;
  points: string[];
}

export const TABS: Tab[] = [
  {
    id: 'projects',
    label: 'Projects',
    image: '/images/1.png',
    title: 'Work on multiple codebases in the same window.',
    points: [
      "Open every repo you're touching side by side, switch with one keystroke",
      'Each codebase keeps its own chats, file tree, terminal, and git state',
      'Background projects stay alive, agents keep running and chats keep streaming',
      'Recent projects, branches, and worktrees one click away in the sidebar'
    ]
  },
  {
    id: 'sessions',
    label: 'Sessions',
    image: '/images/2.png',
    title: 'Run multiple AI agents on the same codebase at once.',
    points: [
      'Each session is an independent chat with its own model and context',
      'One agent refactors while another writes tests and a third reviews a PR',
      'Sessions run in parallel and never block each other',
      'Branch a session to try a different approach without losing the original'
    ]
  },
  {
    id: 'tasks',
    label: 'Tasks',
    image: '/images/3.png',
    title: 'A To Do board the agent works through on its own.',
    points: [
      'Add tasks to a board with To Do, Doing, and Review columns',
      'The agent picks up cards, completes them, and moves them across columns',
      'Every card keeps the chat history of how it got built',
      'Turn any chat into a task, or break a big task into smaller chats'
    ]
  },
  {
    id: 'jobs',
    label: 'Jobs',
    image: '/images/4.png',
    title: "Agents that run on a schedule, even when you're away.",
    points: [
      'Schedule an agent to run every morning, every commit, or every few hours',
      'Bump dependencies overnight, triage issues before standup, draft release notes Friday at 5',
      'Jobs persist across restarts and keep firing on schedule',
      'Results land in your chat list, failures show up in the tray'
    ]
  },
  {
    id: 'terminal-diff',
    label: 'Terminal & Diff',
    image: '/images/5.png',
    title: 'A built-in terminal and live file diffs.',
    points: [
      'Split terminal with one tab per repo, dev server detected and started automatically',
      'Watch files change line by line as the agent edits, no manual refresh',
      'Accept or reject each change inline',
      'The agent runs commands in the same shell you type into'
    ]
  }
];
