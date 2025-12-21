# =====================================================
# 🧱 STAGE 1 — Builder (install + build)
# =====================================================
FROM node:18 AS builder

WORKDIR /app

# Bust cache when needed
ARG CACHE_BREAKER=1

# -----------------------------------------------------
# 1️⃣ Install dependencies (with dev deps)
# -----------------------------------------------------
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------
# 2️⃣ Generate Prisma client (needed for build)
# -----------------------------------------------------
COPY prisma ./prisma
RUN npx prisma generate

# -----------------------------------------------------
# 3️⃣ Copy full source
# -----------------------------------------------------
COPY . .

# -----------------------------------------------------
# 4️⃣ Public build-time env (NON-SECRET)
# -----------------------------------------------------
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SQUARE_APP_ID
ARG NEXT_PUBLIC_SQUARE_LOCATION_ID

ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_SQUARE_APP_ID=$NEXT_PUBLIC_SQUARE_APP_ID
ENV NEXT_PUBLIC_SQUARE_LOCATION_ID=$NEXT_PUBLIC_SQUARE_LOCATION_ID

# -----------------------------------------------------
# 5️⃣ Build Next.js (frontend)
# -----------------------------------------------------
RUN npm run build

# -----------------------------------------------------
# 6️⃣ Remove devDependencies
# -----------------------------------------------------
RUN npm prune --omit=dev


# =====================================================
# 🚀 STAGE 2 — Runtime (minimal image)
# =====================================================
FROM node:18-slim AS runner

WORKDIR /app

# -----------------------------------------------------
# Runtime environment
# -----------------------------------------------------
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# -----------------------------------------------------
# Copy ONLY what runtime needs
# -----------------------------------------------------
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.cjs ./server.cjs
COPY --from=builder /app/package.json ./package.json

# -----------------------------------------------------
# Startup:
# - DATABASE_URL must be provided at runtime
# - Regenerate Prisma client (safe, fast)
# - Apply migrations
# - Start unified server
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
