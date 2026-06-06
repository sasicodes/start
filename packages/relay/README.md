Self-hostable relay for **start** remote access. It connects desktop and mobile over authenticated WebSockets; desktop stays the source of truth for workspaces, sessions, files, tools, and model state.

The relay stores nothing — no prompts, files, history, or credentials. Connections live in memory, so run a single instance (replicas break pairing, and serverless platforms can't hold the socket open).

### Host on the cloud

A prebuilt image is published on every change at `ghcr.io/sasicodes/start/relay:latest` (public, no auth to pull).

On [Railway](https://railway.app): New Project → Deploy from a Docker Image → `ghcr.io/sasicodes/start/relay:latest`, then set `START_RELAY_TOKEN` to a secret. Copy the service URL (`wss://…`) and the token into the desktop app.

### Host locally behind a proxy

Run the relay (below), then expose it with a tunnel:

```sh
ngrok http 8787
```

Use the tunnel's `wss://…` URL and your token in the desktop app.

### Run locally

```sh
START_RELAY_TOKEN=change-me pnpm --filter @start/relay start
```

Point the desktop app at `ws://localhost:8787` with the same token.

### Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8787` | HTTP and WebSocket port. |
| `START_RELAY_TOKEN` | empty | Shared token required in client hello messages. |
| `START_RELAY_PAIRING_TTL_MS` | `300000` | Pairing code lifetime. |
