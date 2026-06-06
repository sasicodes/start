# start relay

Self-hostable relay for start remote access. The relay connects desktop and mobile over authenticated WebSockets while desktop remains the source of truth for workspaces, sessions, files, tools, and model state.

The relay does not store prompts, files, session history, or provider credentials.

## Deploy

Run as a single instance on any container host. It keeps connections in memory, so multiple replicas break pairing, and serverless platforms (Vercel) can't hold the WebSocket open. No clone or build needed — a prebuilt image is published on every change at `ghcr.io/sasicodes/start/relay:latest` (make the GHCR package public for anonymous pulls).

- Render: click [Deploy to Render](https://render.com/deploy?repo=https://github.com/sasicodes/start). It reads [`render.yaml`](../../render.yaml), pulls the image, and generates `START_RELAY_TOKEN`. Keep the `starter` plan — free sleeps on idle.
- Railway: New Project → Deploy from a Docker Image → `ghcr.io/sasicodes/start/relay:latest`, then add `START_RELAY_TOKEN` (`${{ secret(32) }}`).

Copy the generated token and the service URL into the desktop app.

## Run locally

```sh
pnpm --filter @start/relay build
START_RELAY_TOKEN=change-me pnpm --filter @start/relay start
```

Health checks:

```sh
curl http://localhost:8787/health
curl http://localhost:8787/ready
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8787` | HTTP and WebSocket port. |
| `START_RELAY_TOKEN` | empty | Optional shared token required in client hello messages. |
| `START_RELAY_PAIRING_TTL_MS` | `300000` | Pairing code lifetime. |

## WebSocket

Connect to:

```txt
ws://localhost:8787/connect
```

The first message must be a hello message:

```json
{
  "type": "hello.desktop",
  "protocolVersion": 1,
  "desktopId": "desktop-id",
  "token": "change-me"
}
```

or:

```json
{
  "type": "hello.mobile",
  "protocolVersion": 1,
  "mobileId": "mobile-id",
  "token": "change-me"
}
```

After pairing, the relay only routes opaque command and event payloads. Desktop and mobile validate the application-specific payloads themselves.

## Docker

Build from the repository root:

```sh
docker build -f packages/relay/Dockerfile -t start-relay .
docker run --rm -p 8787:8787 -e START_RELAY_TOKEN=change-me start-relay
```
