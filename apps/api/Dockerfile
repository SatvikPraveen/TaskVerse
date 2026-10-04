# apps/api/Dockerfile
# Build from the repository root so workspace packages are available:
#   docker build -f apps/api/Dockerfile -t taskverse-api .
FROM node:26-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/scheduler/package.json packages/scheduler/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN npm ci --ignore-scripts

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/types packages/types
COPY packages/utils packages/utils
COPY packages/scheduler packages/scheduler
COPY apps/api apps/api
RUN npm run build --workspace=packages/types --workspace=packages/scheduler \
 && npm run build --workspace=apps/api \
 && npm prune --omit=dev

FROM node:26-alpine AS runtime
ENV NODE_ENV=production PORT=3001
WORKDIR /app
RUN addgroup -S nodejs && adduser -S api -G nodejs
COPY --from=build --chown=api:nodejs /repo/node_modules ./node_modules
COPY --from=build --chown=api:nodejs /repo/packages ./packages
COPY --from=build --chown=api:nodejs /repo/apps/api/dist ./apps/api/dist
COPY --from=build --chown=api:nodejs /repo/apps/api/openapi ./apps/api/openapi
COPY --from=build --chown=api:nodejs /repo/apps/api/package.json ./apps/api/package.json
USER api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3001/health/ready || exit 1
CMD ["node", "apps/api/dist/server.js"]
