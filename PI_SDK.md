# Pi SDK Reference

Use this file as the local project checklist for what the Pi SDK can do. If anything is missing or stale, refer to the upstream SDK docs: https://pi.dev/docs/latest/sdk

## Agent Runtime

- `createAgentSession()` creates one agent session.
- `createAgentSessionRuntime()` owns replaceable sessions for new, resume, switch, fork, clone, and import flows.
- Runtime integrations must re-subscribe to events whenever `runtime.session` changes.
- The app backend should own the agent runtime. UI should only send intent and render normalized state.

## Working Directory

- `cwd` is agent-level infrastructure.
- `cwd` controls tool path resolution, project settings, project resources, AGENTS.md discovery, and session naming.
- Any app-created agent must receive the selected project folder explicitly.

## Auth and Models

- `AuthStorage.create()` loads credentials.
- `ModelRegistry.create(authStorage)` discovers built-in and custom models.
- Runtime API keys can be set without persisting.
- Models can be selected directly, restored from sessions, loaded from settings, or cycled with scoped models.
- Thinking levels are `off`, `minimal`, `low`, `medium`, `high`, and `xhigh`.

## Prompting

- `session.prompt(text, options)` sends a prompt.
- `session.steer(text)` queues steering instructions while streaming.
- `session.followUp(text)` queues follow-up work after the current run finishes.
- Prompt options support images, prompt-template expansion, preflight result callbacks, and streaming behavior.

## Events

Normalize SDK events in the backend before sending them to UI.

Important events:

- `message_start`
- `message_update`
- `message_end`
- `agent_start`
- `agent_end`
- `turn_start`
- `turn_end`
- `tool_execution_start`
- `tool_execution_update`
- `tool_execution_end`
- `queue_update`
- `compaction_start`
- `compaction_end`
- `auto_retry_start`
- `auto_retry_end`

## Tools

Built-in tools:

- `read`
- `bash`
- `edit`
- `write`
- `grep`
- `find`
- `ls`

Use cwd-bound factories when the app cwd may differ from `process.cwd()`:

- `createCodingTools(cwd)`
- `createReadOnlyTools(cwd)`
- `createReadTool(cwd)`
- `createBashTool(cwd)`
- `createEditTool(cwd)`
- `createWriteTool(cwd)`
- `createGrepTool(cwd)`
- `createFindTool(cwd)`
- `createLsTool(cwd)`

Do not use prebuilt tool instances with a custom cwd.

## Custom Tools

- Use `defineTool()` for app-level tools.
- Use TypeBox schemas for parameters.
- Use `onUpdate` for streaming tool progress.
- Put durable tool state in result `details`.
- Throw errors to mark tool execution as failed.
- Use `withFileMutationQueue()` for any custom tool that mutates files.
- Truncate large outputs before returning them to the model.

## Resources

`DefaultResourceLoader` discovers and loads:

- extensions
- skills
- prompt templates
- themes
- AGENTS.md / CLAUDE.md context files
- settings
- custom models

It can also override or append skills, prompts, context files, extension factories, and system prompt behavior.

## Context and System Prompt

- Context files are agent-level inputs, not UI-level inputs.
- Pi discovers global and project `AGENTS.md` files automatically through the resource loader.
- `.pi/SYSTEM.md` can replace the default prompt.
- `APPEND_SYSTEM.md` can append to the prompt.
- Extensions can modify the prompt per turn through `before_agent_start`.

## Settings

- `SettingsManager.create(cwd, agentDir)` loads global and project settings.
- `SettingsManager.inMemory()` is useful for testing or controlled app state.
- Use `applyOverrides()` for app defaults.
- Use `flush()` before shutdown when durability matters.
- Use `drainErrors()` to surface settings persistence failures.

## Sessions

- `SessionManager.inMemory()` creates ephemeral sessions.
- `SessionManager.create(cwd)` creates persistent project sessions.
- `SessionManager.continueRecent(cwd)` resumes recent sessions.
- `SessionManager.open(path)` opens a specific session file.
- `SessionManager.list(cwd)` lists project sessions.
- `SessionManager.listAll(cwd)` lists all sessions.

Session tree APIs support entries, paths, leaves, labels, branching, branch summaries, and branched session creation.

## Compaction and Tree Navigation

- `session.compact(customInstructions?)` compacts context.
- `session.abortCompaction()` cancels compaction.
- `session.navigateTree(targetId, options)` navigates session history.
- Tree navigation can summarize abandoned branches and attach labels.

## Extensions

Extensions can:

- register tools
- register commands
- register shortcuts
- register flags
- register providers
- intercept input
- mutate context
- modify system prompts
- inspect provider payloads
- block or mutate tool calls
- modify tool results
- customize compaction
- react to model and thinking changes
- persist extension state
- send user messages
- manage active tools
- communicate through an event bus

Use extension factories in the app backend for permissions, path protection, provider setup, and app-specific agent behavior.

## Permissions and Safety

Implement permission policy in the agent layer:

- tool allowlists
- protected paths
- destructive bash blocking
- write/edit gates
- environment and secrets protection
- custom bash spawn hooks
- sandbox or remote operation adapters

## Remote and Sandbox Execution

Built-in tools support custom operations for read, write, edit, bash, grep, find, and ls. This allows local, SSH, container, or sandbox-backed execution without changing UI.

## Provider Customization

Extensions can call:

- `pi.registerProvider(name, config)`
- `pi.unregisterProvider(name)`

Providers can define custom APIs, base URLs, headers, OAuth, models, and streaming behavior.

## First Infrastructure Targets

1. Build a headless agent runtime service.
2. Make cwd explicit for every session.
3. Use cwd-bound tool factories.
4. Normalize SDK events before they reach UI.
5. Move model/auth/settings/session/resource handling behind backend services.
6. Add an inline extension for permissions and protected paths.
7. Add persistent session lifecycle support.

For details beyond this checklist, refer to https://pi.dev/docs/latest/sdk and the installed package docs under the local Pi package documentation directory.
