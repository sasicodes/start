# start relay

Self-hostable relay for start remote access. The relay connects desktop and mobile over authenticated WebSockets while desktop remains the source of truth for workspaces, sessions, files, tools, and model state.

The relay does not store prompts, files, session history, or provider credentials.

## Deploy

The relay is a single stateful WebSocket process. It holds live desktop and mobile connections in memory, so it must run as **one instance** — multiple replicas would split the routing table and break pairing. Run it on a container host, not a serverless platform (Vercel Functions cannot host long-lived WebSockets).

You don't need to clone or build anything locally — both platforms deploy straight from Git. **Fork this repo** (or point the platform at your own copy), then click a button. Render and Railway build the [`Dockerfile`](Dockerfile) in the cloud, run one instance, health-check `/health`, and generate `START_RELAY_TOKEN` for you. Copy that token from the dashboard into the desktop and mobile clients after the first deploy.

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/sasicodes/start)

- **Render** reads [`render.yaml`](../../render.yaml) at the repo root and generates the token automatically. The `starter` plan is intended — the free plan sleeps on idle and drops connections.
- **Railway** reads [`railway.toml`](../../railway.toml) for the Docker build and single-replica deploy. For true one-click, publish a template once and mark `START_RELAY_TOKEN` as a generated secret (`${{ secret(32) }}`); the button otherwise deploys from your fork with that variable set manually.

`PORT` is provided by the platform and read automatically; leave it unset. The runtime image is just `node:24-alpine` plus a single bundled file — no `node_modules` ship to production.

### Prebuilt image

Every push to `main` that touches the relay rebuilds and publishes the image to GitHub Container Registry via [`relay-image.yml`](../../.github/workflows/relay-image.yml):

```sh
docker run --rm -p 8787:8787 -e START_RELAY_TOKEN=change-me ghcr.io/sasicodes/start-relay:latest
```

Tagged `latest` and the commit `sha`. Make the package public once under the repo's Packages settings to allow anonymous pulls.

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
