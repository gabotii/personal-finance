# syntax=docker/dockerfile:1.7

# ---- dependencies (shared by dev and build) ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- development: Vite dev server with HMR (source is bind-mounted) ----
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- production build ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- runtime: static files + reverse proxy, as a non-root user ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
