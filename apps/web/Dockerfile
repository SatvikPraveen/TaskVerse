# apps/web/Dockerfile
# Build from the repository root:
#   docker build -f apps/web/Dockerfile -t taskverse-web .
FROM node:20-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/scheduler/package.json packages/scheduler/
COPY packages/eslint-config/package.json packages/eslint-config/
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/types packages/types
COPY apps/web apps/web
RUN npm run build --workspace=packages/types && npm run build --workspace=apps/web

FROM nginx:1.31-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
