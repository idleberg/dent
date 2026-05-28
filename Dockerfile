# Build:
# $ docker build -t dent .
#
# Usage:
# $ docker run --rm -v "$PWD:/work" dent <command> [options] [file...]

FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/dent/package.json packages/dent/
COPY packages/dent-cli/package.json packages/dent-cli/

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY packages/dent/ packages/dent/
COPY packages/dent-cli/ packages/dent-cli/

RUN pnpm run build
RUN pnpm deploy --filter @nsis/dent-cli --prod /app/deploy

FROM node:24-alpine

WORKDIR /work

COPY --from=base /app/deploy /app

ENV NODE_PATH=/app/node_modules

ENTRYPOINT ["node", "/app/bin/cli.mjs"]
