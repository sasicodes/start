FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches
COPY packages/relay/package.json packages/relay/package.json
RUN pnpm install --filter @start/relay... --frozen-lockfile

COPY packages/relay packages/relay
RUN pnpm --filter @start/relay build

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY --from=build --chown=node:node /app/packages/relay/dist ./dist

USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]
