# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:20.11.1 AS builder

WORKDIR /app/backend

# -----------------------------------------------------
# 1️⃣ Install dependencies (including dev deps)
# -----------------------------------------------------
COPY backend/package*.json ./
RUN npm ci

# -----------------------------------------------------
# 2️⃣ Prisma client generation
# -----------------------------------------------------
COPY backend/prisma ./prisma
RUN npx prisma generate --schema=prisma/schema.prisma

# -----------------------------------------------------
# 3️⃣ Copy backend source
# -----------------------------------------------------
COPY backend ./

# -----------------------------------------------------
# 4️⃣ Remove dev dependencies
# -----------------------------------------------------
RUN npm prune --omit=dev


# =====================================================
# 🚀 STAGE 2 — Runtime (NON-ROOT, MINIMAL)
# =====================================================
FROM node:20.11.1-slim AS runner

# OpenSSL required for Prisma + TLS
RUN apt-get update && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# 👤 Create non-root user
RUN groupadd -r app && useradd -r -g app app

# -----------------------------------------------------
# ❤️ Healthcheck
# -----------------------------------------------------
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 8080

# -----------------------------------------------------
# Copy runtime artifacts
# -----------------------------------------------------
COPY --from=builder --chown=app:app /app/backend ./backend
COPY --chown=app:app backend/server.cjs ./server.cjs


USER app

# -----------------------------------------------------
# Start backend
# -----------------------------------------------------
CMD ["node", "backend/server.cjs"]