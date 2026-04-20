FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY pnpm-lock.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile --reporter=append-only

COPY . .

RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN corepack enable

COPY --from=build /app /app

CMD ["sh", "-c", "pnpm --filter @chat/server migrate && pnpm --filter @chat/server seed && pnpm --filter @chat/server start"]
