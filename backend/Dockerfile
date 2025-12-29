# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:18 AS builder

WORKDIR /app

# -----------------------------------------------------
# 1️⃣ Install deps (including dev deps)
# -----------------------------------------------------
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------
# 2️⃣ Prisma client generation
# -----------------------------------------------------
COPY prisma ./prisma
RUN npx prisma generate

# -----------------------------------------------------
# 3️⃣ Copy backend source
# -----------------------------------------------------
COPY backend ./backend
COPY server.cjs ./server.cjs

# -----------------------------------------------------
# 4️⃣ Remove devDependencies
# -----------------------------------------------------
RUN npm prune --omit=dev


# =====================================================
# 🚀 STAGE 2 — Runtime (NON-ROOT)
# =====================================================
FROM node:18-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# -----------------------------------------------------
# 👤 Create non-root user
# -----------------------------------------------------
RUN groupadd -r app && useradd -r -g app app

EXPOSE 8080

# -----------------------------------------------------
# ❤️ Docker healthcheck (backend liveness)
# -----------------------------------------------------
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# -----------------------------------------------------
# Copy runtime artifacts (owned by app)
# -----------------------------------------------------
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/backend ./backend
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/server.cjs ./server.cjs
COPY --from=builder --chown=app:app /app/package.json ./package.json

# -----------------------------------------------------
# Drop privileges
# -----------------------------------------------------
USER app

# -----------------------------------------------------
# Startup (UNCHANGED LOGIC)
# -----------------------------------------------------
CMD ["sh", "-c", "\
  if [ -z \"$DATABASE_URL\" ]; then \
    echo 'ERROR: DATABASE_URL is not set' >&2; exit 1; \
  fi; \
  echo \"Using DATABASE_URL (masked): $(echo \"$DATABASE_URL\" | sed -E 's#//([^:]+):([^@]+)@#//\\1:****@#')\"; \
  npx prisma generate && \
  npx prisma migrate deploy && \
  node server.cjs \
"]
