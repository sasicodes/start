FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches patches
COPY packages/relay/package.json packages/relay/package.json
RUN pnpm install --filter @start/relay... --frozen-lockfile

COPY packages/relay packages/relay
RUN pnpm --filter @start/relay build
RUN pnpm --filter @start/relay deploy --prod --legacy --config.allow-unused-patches=true /prod

FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787

COPY --from=build --chown=node:node /prod ./

USER node
EXPOSE 8787
CMD ["node", "dist/index.js"]
