# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:20.11.1 AS builder

WORKDIR /app

# 1️⃣ Copy workspace manifests FIRST (CRITICAL)
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# 2️⃣ Install deps (dev deps required for build)
RUN npm ci

# 3️⃣ Copy frontend source
COPY frontend ./frontend

# 4️⃣ Build Next.js (standalone output)
WORKDIR /app/frontend
RUN npm run build


# =====================================================
# 🚀 STAGE 2 — Runtime (NON-ROOT, STANDALONE)
# =====================================================
FROM node:20.11.1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 👤 Create non-root user
RUN groupadd -r app && useradd -r -g app app

# -----------------------------------------------------
# 📦 Copy standalone runtime output
# -----------------------------------------------------
# Includes server.js + minimal node_modules
COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public

# Ensure ownership
RUN chown -R app:app /app

EXPOSE 3000

# ❤️ Healthcheck (unchanged behavior)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Drop privileges
USER app

# 🚀 Start Next.js standalone server
WORKDIR /app/frontend
CMD ["node", "server.js"]