FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm fetch --frozen-lockfile

COPY . .

RUN pnpm install --frozen-lockfile --offline --reporter=append-only
RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN corepack enable

COPY --from=build /app /app

CMD ["sh", "-c", "pnpm --filter @chat/server migrate && if [ \"${RUN_SEED:-true}\" = \"true\" ]; then pnpm --filter @chat/server seed; fi && pnpm --filter @chat/server start"]
