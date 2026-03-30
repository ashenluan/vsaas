FROM node:20-alpine AS base
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-validators/package.json ./packages/shared-validators/
RUN pnpm install --frozen-lockfile --filter @vsaas/api...

# Generate Prisma client
FROM deps AS prisma
COPY packages/database/ ./packages/database/
RUN cd packages/database && npx prisma generate

# Build
FROM prisma AS build
COPY packages/shared/ ./packages/shared/
COPY packages/shared-types/ ./packages/shared-types/
COPY packages/shared-validators/ ./packages/shared-validators/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json ./
RUN cd apps/api && pnpm build

# Run directly from build stage to preserve pnpm symlinks
ENV NODE_ENV=production
EXPOSE 4000
ENV PORT=4000

CMD ["node", "apps/api/dist/main.js"]
