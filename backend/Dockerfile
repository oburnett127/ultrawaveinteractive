# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:20.11.1-slim AS builder

WORKDIR /app

# -----------------------------------------------------
# 1️⃣ Install deps
# -----------------------------------------------------
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------
# 2️⃣ Copy backend + server entry
# -----------------------------------------------------
COPY backend ./backend
COPY server.cjs ./server.cjs

# ✅ RUN MIGRATIONS AT BUILD TIME
ARG DATABASE_URL
RUN if [ -z "$DATABASE_URL" ]; then echo "DATABASE_URL missing"; exit 1; fi && \
    npx prisma migrate deploy --schema=backend/prisma/schema.prisma

# -----------------------------------------------------
# 3 Remove dev deps
# -----------------------------------------------------
RUN npm prune --omit=dev


# =====================================================
# 🚀 STAGE 2 — Runtime (MINIMAL, NON-ROOT)
# =====================================================
FROM node:20.11.1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# -----------------------------------------------------
# 👤 Non-root user
# -----------------------------------------------------
RUN groupadd -r app && useradd -r -g app app

EXPOSE 8080

# -----------------------------------------------------
# ❤️ Healthcheck
# -----------------------------------------------------
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# -----------------------------------------------------
# Copy runtime artifacts only
# -----------------------------------------------------
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/backend ./backend
COPY --from=builder --chown=app:app /app/server.cjs ./server.cjs
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app

# ✅ NO npx / npm AT RUNTIME
CMD ["node", "server.cjs"]