# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:20.11.1-slim AS builder

RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1️⃣ Install backend deps
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# 2️⃣ Copy Prisma schema and generate client
COPY backend/prisma ./prisma
RUN ./node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# 3️⃣ Remove dev deps (AFTER generate)
RUN npm prune --omit=dev

# 4️⃣ Copy remaining backend files
WORKDIR /app
COPY backend ./backend
COPY server.cjs ./server.cjs

# =====================================================
# 🚀 STAGE 2 — Runtime (MINIMAL, NON-ROOT)
# =====================================================
FROM node:20.11.1-slim AS runner

RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# 👤 Non-root user
RUN groupadd -r app && useradd -r -g app app

EXPOSE 8080

# ❤️ Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Copy backend runtime artifacts
COPY --from=builder --chown=app:app /app/backend ./backend
COPY --from=builder --chown=app:app /app/server.cjs ./server.cjs

USER app

# ✅ App only — NO npm, NO npx, NO migrations
CMD ["node", "server.cjs"]
