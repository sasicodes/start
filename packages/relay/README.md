Self-hostable relay for **start** remote access. It connects desktop and mobile over authenticated WebSockets.

The desktop stays the source of truth for workspaces, sessions, files, tools, and model state. The relay stores nothing: no prompts, files, history, or credentials. Connections live in memory, so run a single instance; replicas break pairing.

Docker image:

```sh
ghcr.io/sasicodes/start/relay:latest
```

Run it:

```sh
docker run -p 8787:8787 \
  -e START_RELAY_TOKEN=change-me \
  ghcr.io/sasicodes/start/relay:latest
```

Use `wss://your-relay-host/connect` and the same `START_RELAY_TOKEN` in the desktop app. Serve it behind HTTPS before exposing it publicly.

Run locally:

```sh
START_RELAY_TOKEN=change-me pnpm --filter @start/relay start
```

Use `ws://localhost:8787/connect` with the same token.

Environment variables:

```txt
PORT=8787
START_RELAY_TOKEN=change-me
START_RELAY_PAIRING_TTL_MS=300000
```

`START_RELAY_PAIRING_TTL_MS` is in milliseconds.
