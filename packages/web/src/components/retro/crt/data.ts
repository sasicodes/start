export interface ChatItem {
  id: string;
  title: string;
  messages: { role: 'user' | 'assistant'; text: string }[];
}

export const CHATS: ChatItem[] = [
  {
    id: 'what-is-start',
    title: 'What is Start?',
    messages: [
      {
        role: 'user',
        text: 'What exactly is Start and how does it work?'
      },
      {
        role: 'assistant',
        text: 'Start is an AI-powered desktop IDE that combines a three-panel workspace with an integrated coding agent. It runs as a native Tauri app on your machine, giving you a left sidebar for chat history and tasks, a center pane for conversations and code, and a right sidebar with a file tree and terminal.\n\nThe agent can read your codebase, edit files, run commands, create commits, and open pull requests: all from natural language instructions. Think of it as a teammate that lives inside your editor.'
      }
    ]
  },
  {
    id: 'codebase-index',
    title: 'How does indexing work?',
    messages: [
      {
        role: 'user',
        text: 'How does Start understand my codebase?'
      },
      {
        role: 'assistant',
        text: 'When you open a project, a background indexer runs git ls-files, reads each file, extracts imports and exported symbols, and stores everything in a local SQLite database. It builds an in-memory import graph so tools like FindRelatedFiles can trace dependencies in both directions.\n\nThe index updates incrementally: when files change, only the diff is reprocessed. MCP tools like SearchSymbols, SmartGrep, and GetCodebaseBrief query this index to give the agent deep context about your code without reading every file on each request.'
      }
    ]
  },
  {
    id: 'agent-models',
    title: 'Which models are available?',
    messages: [
      {
        role: 'user',
        text: 'What AI models can I use?'
      },
      {
        role: 'assistant',
        text: 'Start supports three Claude models you can cycle between with a single click:\n\n- Opus: the most capable model, best for complex reasoning and multi-step tasks\n- Sonnet: balanced speed and quality, great for everyday coding\n- Haiku: the fastest model, ideal for quick edits and simple questions\n\nThe model selector is right in the prompt bar. You can switch mid-conversation, and the agent adapts instantly. Each model is color-coded so you always know which one you are talking to.'
      }
    ]
  },
  {
    id: 'git-integration',
    title: 'Git, GitHub, and GitLab',
    messages: [
      {
        role: 'user',
        text: 'How does the Git integration work?'
      },
      {
        role: 'assistant',
        text: 'The right sidebar shows staged and unstaged changes with inline diffs. You can stage, unstage, and revert files directly. The agent can also commit, push, and create pull requests or merge requests from the chat: just ask.\n\nStart watches your repo for changes in real time. When you are behind the remote, a pull button appears. Start detects whether your remote is GitHub or GitLab and uses `gh` or `glab` to surface PR/MR status, review comments, and CI checks without leaving the app. The agent reads that context to help you address review feedback.'
      }
    ]
  },
  {
    id: 'tasks-kanban',
    title: 'Task management',
    messages: [
      {
        role: 'user',
        text: 'What is the tasks panel for?'
      },
      {
        role: 'assistant',
        text: 'The left sidebar has a kanban board where the agent tracks its work. When it starts a complex task, it creates a todo list with pending, in-progress, and completed items. You can also create tasks manually.\n\nTasks persist across sessions and sync through SQLite. The agent updates them in real time as it works: so you can see exactly what has been done, what is in progress, and what remains. Think of it as a shared checklist between you and the AI.'
      }
    ]
  },
  {
    id: 'terminal',
    title: 'Integrated terminal',
    messages: [
      {
        role: 'user',
        text: 'Tell me about the terminal.'
      },
      {
        role: 'assistant',
        text: 'The terminal lives at the bottom of the right sidebar with a draggable split handle. It runs a real shell session inside the app: you can run dev servers, build commands, and tests without switching windows.\n\nThe agent can also run commands through the terminal. When it executes a build or test suite, you see the output in real time. The terminal supports split views and can be popped out into its own section. It is a full xterm.js instance with scrollback, search, and proper ANSI color support.'
      }
    ]
  },
  {
    id: 'file-mentions',
    title: 'File mentions and context',
    messages: [
      {
        role: 'user',
        text: 'How do I give the agent context about specific files?'
      },
      {
        role: 'assistant',
        text: 'Type @ in the prompt to mention specific files. A fuzzy search dropdown appears showing your project files. Selected files are attached as context to your message, so the agent reads them before responding.\n\nYou can also drag and drop files, attach folders for broader context, or paste images. The agent auto-references files from your open tabs when relevant. File mentions show as pills below the prompt so you can see exactly what context is being sent.'
      }
    ]
  },
  {
    id: 'scheduled-jobs',
    title: 'Scheduled jobs',
    messages: [
      {
        role: 'user',
        text: 'Can Start run tasks on a schedule?'
      },
      {
        role: 'assistant',
        text: 'Yes. The Jobs panel lets you create cron-scheduled tasks that run automatically. You write a natural language prompt and set a cron expression: the agent executes it on schedule.\n\nUse cases include running test suites every hour, checking for dependency updates daily, generating reports, or monitoring CI status. Jobs run in the background and log their output so you can review results later. Each job can use a different model to balance cost and capability.'
      }
    ]
  },
  {
    id: 'vs-cursor',
    title: 'How is this different from Cursor?',
    messages: [
      {
        role: 'user',
        text: 'How is Start different from Cursor or Copilot?'
      },
      {
        role: 'assistant',
        text: 'Start is a standalone agent workspace, not an editor extension. Instead of autocomplete inside VS Code, Start gives you a dedicated environment where the AI is a first-class participant: it reads your full codebase index, manages tasks, runs terminal commands, and handles Git operations end to end.\n\nThe three-panel layout is purpose-built for agent workflows: chat on the left, code and diffs in the center, files and terminal on the right. It is closer to how tools like Claude Code or Codex work, but with a native desktop UI instead of a CLI.'
      }
    ]
  }
];

export const FILE_TREE = [
  { name: 'app', depth: 0, isDir: true, isOpen: true },
  { name: 'index.tsx', depth: 1, isDir: false, isOpen: false },
  { name: 'dashboard', depth: 1, isDir: true, isOpen: true },
  { name: 'overview.tsx', depth: 2, isDir: false, isOpen: false },
  { name: 'widgets', depth: 2, isDir: true, isOpen: false },
  { name: 'components', depth: 1, isDir: true, isOpen: false },
  { name: 'reports', depth: 1, isDir: true, isOpen: false },
  { name: 'settings', depth: 1, isDir: true, isOpen: false },
  { name: 'billing', depth: 1, isDir: true, isOpen: false },
  { name: 'notifications', depth: 1, isDir: true, isOpen: false },
  { name: 'onboarding', depth: 1, isDir: true, isOpen: false }
];
