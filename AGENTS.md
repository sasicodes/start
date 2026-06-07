# Rules

This file is grouped into sections so you can scan the relevant ones fast. Follow every rule.

## Project & workflow

- This is an open source project.
- Prefer long-term, scalable fixes over short-term patches.
- Treat PR comments and automated reviewer findings (Greptile, CodeRabbit, etc.) as advisory; verify each claim against current code before acting. Reviewers can be wrong, outdated, or hallucinated.
- Follow commit and PR title style: lowercase, precise, prefixed with `fix:`, `feat:`, or `chore:`.
- Keep code warning-free and error-free. Run `pnpm check` before reporting completion.
- App description: `your coding assistant`.
- App name: `start`. Bundle identifier: `one.intelligence.start`. Public domain: `https://start.intelligence.one`.

## Architecture & state

- Prefer shared state over prop drilling: when a value or handler is needed by distant components, keep it in a signal store (`@preact/signals` in a `*/state.ts`, e.g. `shared/settings/state.ts`) and read it where needed instead of threading the same prop/handler through many layers.
- Keep component props minimal, precise, and subtle; never over-define. Do not repeat the component's own name or domain in a prop — a `ComposerShortcut` takes `value`/`onChange`, not `composerShortcut`. Prefer composite/compound components over deep prop chains.
- Keep local prop names minimal and contextual; avoid repeating parent or domain words like `panelOpen` or `onOpenPanel` inside a component that only controls one panel. Prefer `open`, `onOpen`, `value`.
- Extract any helper or parser used in more than one file into a domain `utils` folder; do not duplicate.
- Read environment variables only through `packages/desktop/src/main/environment.ts`.
- Keep agent tools and page-content extraction bounded with explicit time, size, and count limits; prefer targeted structured output over broad dumps.

## TypeScript & code quality

- Prefer standard-library built-ins over hand-rolled equivalents (e.g. `Buffer.readUInt32BE` instead of manual byte math).
- Do not use TypeScript `any`; use `unknown` with explicit parsing, narrow unions, or well-defined interfaces.
- Trust the type system: do not add runtime guards, optional chaining, or shape re-parsing for values the types already guarantee, such as a non-nullable parameter or a typed `promisify(execFile)` result.
- Delete dead complexity: unreachable branches, guards that always pass, unused return values, object keys a spread already sets, and effect work the state initializer already did. Narrow over-wide union parameters to what callers actually pass.
- Do not add lint, format, or type suppressions such as `@ts-ignore`, `biome-ignore`, or `eslint-disable`.
- Use `interface` for component props and shared object shapes; use `type` for unions, function aliases, mapped types, and utility-composed shapes.
- Omit optional object properties when absent instead of serializing placeholder nullish values.
- Model renderer loading state with explicit discriminated unions instead of stacking nullish sentinels.
- Use a bare `return;` for no-value exits.
- For optional JSX or object props, use a conditional spread with a truthy guard (`...(value ? { value } : {})`) instead of passing absent props with a ternary. Keep the falsy branch only when `0`, `false`, or `''` is a valid value to preserve.
- Extract long boolean expressions, multi-branch render logic, chained fallbacks, and repeated checks into named helpers or booleans before JSX. Collapse consecutive guard clauses that return the same value into one condition.
- In ternaries, the truthy branch carries the meaningful value and the falsy branch is the empty fallback. Flip `state === target ? '' : target` to `state !== target ? target : ''`. Avoid placeholder ternaries like `condition ? '' : value`; split branches or extract helpers.
- Avoid the `void` operator when a clearer alternative exists. Inside async functions, prefer `await` with `try/catch` over `.then`/`.catch`. For fire-and-forget calls protected by `try/catch` or `.catch`, drop the `void` and rely on TypeScript's return-type covariance (`() => Promise<void>` assigns to `() => void`). Keep `void` only when the discard is otherwise ambiguous.
- Keep code comment-free unless a comment prevents a real maintenance hazard.
- Prefer arrow functions for components, helpers, callbacks, and async functions; avoid function declarations unless a framework, class prototype, or external API requires them.
- Avoid single-use indirection; inline single-use constants, helpers, wrapper components, and forwarding callbacks unless a name removes meaningful duplication or prevents a maintenance hazard. Never wrap a referentially stable function such as a `useState` setter in `useCallback`.
- Prefer empty strings for absent renderer-only string state (selected ids, model keys, paths); omit optional object properties at API boundaries.
- Never write `undefined` literally. For swallowed promise rejections use `.catch(() => {})`. For absent state, omit the property or use an empty string per the rules above.

## React & Preact

- Each `useEffect` must synchronize with an external system, subscription, timer, storage, or DOM observer. Do not use effects for derived state.
- For async renderer state tied to props or ids, store the loaded value with its key and derive stale/loading fallbacks during render instead of resetting state in an effect.
- Clean up every timer, animation frame, listener, watcher, subscription, and observer. Avoid duplicate polling for the same source. Batch high-frequency visual updates with animation frames; coalesce non-visual high-frequency updates such as streaming text with a throttled timer so idle frames do no work.
- Extract effect setup, async data fetching, and subscription logic into named custom hooks (`use*`) when the effect carries its own state, refs, or more than a few lines of setup.
- Never assign rendered JSX (an element) to a constant or variable; render it inline, pass it inline as a slot prop, or extract a named component. Components are functions, not element-valued constants.
- Handle a promise's rejection once, inside the worker function that owns it, then pass that function directly as the handler. Do not inline `.catch`/`.then`/`try-catch` in a JSX handler prop, and never wrap a function that already handles its own errors in another `.catch`.

## Styling

- Avoid vague theme names like `bg-bg`. Use descriptive names like `bg-canvas`, `bg-composer`, `bg-control`, `text-ink`, `text-soft`.
- Prefer Tailwind utilities over custom CSS. Limit `styles.css` to theme tokens, global element rules, keyframes, pseudo-elements, and third-party data-attribute states Tailwind cannot express.
- Prefer named Tailwind utilities over arbitrary values; use arbitrary values only when no base utility preserves the intended measurement, selector, or color.
- Do not add theme tokens that duplicate Tailwind defaults (e.g. `--color-white`); use built-in utilities like `bg-white` unless the value is an app-specific semantic token.
- Remove custom class hooks when inline Tailwind utilities or component props can express the same styling.
- Use Tailwind `size-*` instead of matching `w-*` and `h-*` for square elements.
- In markdown and third-party selector CSS, use Tailwind `@apply` for expressible styles; use raw CSS only for pseudo-elements, browser-specific selectors, data attributes, or values Tailwind cannot express.
- Do not put Tailwind class lists in constants. Tailwind classes and conditional styling belong inline in `class` or `className`. Use `tw` only inside those attributes for conditional inline classes; when styling repeats, extract a component, not a constant.
- The renderer runs in Electron Chromium. Avoid Safari, Firefox, and legacy Edge fallback CSS. Keep only Chromium/Electron-required prefixed CSS such as `-webkit-app-region` or `::-webkit-scrollbar`.

## UI & interaction

- Keep UI snappy: avoid flicker, avoid unnecessary re-renders, memoize only when it helps, and animate only opacity and transform for high-frequency UI.
- Do not show loaders, spinners, or hidden status text while session messages hydrate; keep the session surface empty and layout-stable until content arrives.
- Keep primary conversational content direct; place diagnostics, metadata, and tool output behind concise collapsed details.
- Prefer optimistic cached UI data for popovers, pickers, and frequently opened surfaces; refresh in the background and update only when real data changes.
- Use hover backgrounds only when an inline control needs a filled selected affordance; otherwise use text-color feedback.
- For small icon-only controls, keep visual size stable and expand the hit area with a pseudo-element like `before:absolute before:-inset-2` when precision clicking would be frustrating.
- For expandable rows, keep identifiers inline in titles and reserve expanded content for supporting output, diffs, or detail bodies.
- Window, html, body, and root backgrounds must stay transparent in light and dark mode.
- The prompt send button icon must stay visible in all themes and use a 2 px stroke.
- Tooltips must use Base UI side data attributes for direction-aware transform and opacity animations.
- Build interactive controls on Base UI primitives (Switch, Tooltip, …) wrapped as thin composites styled with our tokens via `data-[...]` variants; do not hand-roll them.
- Use a toggle for binary settings (enable/disable, install/uninstall) instead of a text-label button.
- Drive on/active/selected affordances with a bold existing accent token (e.g. `bg-progress`), never green or ad-hoc colors.
- Keep UI copy short and plain; do not use em dashes.
- Use system UI fonts only.
- Keep `packages/desktop/build/icons` and `packages/desktop/src/renderer/public` icons in sync.

## Naming & files

- Use camelCase for variables, functions, hooks, and local constants; PascalCase for types and components; kebab-case for file names, folder names, CSS custom properties, and persisted storage keys.
- Prefix persisted browser storage keys with `start:`, keep the namespaced value kebab-case, and name the constant with a clear `StorageKey` suffix.
- Split component files before they approach 300 lines.
- Group files that share a domain or filename prefix into a domain folder instead of leaving flat clusters like `workspace-*` files.
- Prefer single-word filenames. When two or more files share a multi-word prefix (e.g. `provider-form`, `provider-list`), promote that prefix to a folder and shorten each child to its distinguishing word (`provider/form.tsx`, `provider/list.tsx`). A lone, unambiguous multi-word name is fine; do not fold framework conventions such as `use-*` hooks.
- Inside domain folders, keep child filenames short and precise; avoid repeating the folder/domain name unless it improves clarity.
- Prefer descriptive file names over generic ones (`items`, `panels`, etc.) so module purpose is obvious from filename.
- Name component files with clear component words only; avoid unnecessary domain prefixes or role suffixes like `composer-model-picker`, `thinking-button`, `list`, or `card` when the parent folder or component purpose is already clear.
- Prefer `index.ts` or `index.tsx` when a module file would repeat its parent folder name.

## Testing

- Add or extend tests for any logic change. If logic is buried inside a component or untestable wrapper, extract the pure parts into exported functions first, then assert each branch.
- Keep test mocks faithful to real runtime behavior; fix an inaccurate mock (e.g. attach `util.promisify.custom` so a mocked `promisify`d function resolves the real `{ stdout, stderr }` shape) rather than adding production code to satisfy a loose mock.

## Formatting

- Sort sortable code by total line length when it doesn't hurt readability or break framework conventions: interface and type members, object keys and values, JSX props, variables, hooks, hook dependencies, destructured constants, CSS variables, and written statement objects.
- Group related declarations — hooks, derived constants, handlers — and separate the groups with a blank line.
