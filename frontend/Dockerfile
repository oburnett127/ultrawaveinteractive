# =========================
# 🧱 Builder
# =========================
FROM node:20.11.1 AS builder

WORKDIR /app

# Copy root manifests (lockfile lives here)
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# ✅ Install deps ONCE, using root lockfile
RUN npm ci

# Copy frontend source
COPY frontend ./frontend

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# =========================
# 🚀 Runtime
# =========================
FROM node:20.11.1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd -r app && useradd -r -g app app

# Copy standalone bundle (self-contained now)
COPY --from=builder /app/frontend/.next/standalone/frontend ./frontend

# Static assets
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

RUN chown -R app:app /app

EXPOSE 3000

USER app

CMD ["node", "frontend/server.js"]
