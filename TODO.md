# TODO

- Add extension command argument completions for slash commands.
- Custom widget descriptors for extension tool outputs (category 5). Define a declarative `{ kind: 'widget', widget: 'form'|'table'|'picker'|'confirm'|'file-tree', props: ... }` shape and ship native renderers for each. Punt until at least three real extensions request UI beyond the JSON/markdown/image fallback in `tool-details.ts`.
