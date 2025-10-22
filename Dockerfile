# Use Node 18 LTS
FROM node:18

WORKDIR /app

ARG CACHE_BREAKER=1

# ---- 1) Install deps (cached) ----
COPY package*.json ./
# Prefer npm ci when lockfile exists; fallback to npm install if needed
RUN npm ci --omit=optional || npm install

# ---- 2) Generate Prisma client BEFORE the Next.js build ----
# Copy only prisma schema first for better caching
COPY prisma ./prisma
RUN npx prisma generate

# ---- 3) Copy the rest of the app and build ----
COPY . .

# Expose public build-time env (non-secret). Northflank can pass this as a Build arg.
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SQUARE_APP_ID
ARG NEXT_PUBLIC_SQUARE_LOCATION_ID
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_SQUARE_APP_ID=$NEXT_PUBLIC_SQUARE_APP_ID
ENV NEXT_PUBLIC_SQUARE_LOCATION_ID=$NEXT_PUBLIC_SQUARE_LOCATION_ID

# Build Next.js for production (Prisma client already generated)
RUN npm run build

# ---- 4) Runtime config ----
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# At runtime we expect DATABASE_URL and RECAPTCHA_SECRET_KEY to come from Northflank
# If DATABASE_URL is not provided, we compose it from parts (USERNAME, PASSWORD, HOST, DB_PORT, DATABASE).
# We also re-run prisma generate defensively (safe + quick), then apply migrations, then start.
CMD ["sh", "-c", "\
  if [ -z \"$DATABASE_URL\" ]; then \
    echo 'ERROR: DATABASE_URL is not set' >&2; exit 1; \
  fi; \
  echo \"Using DATABASE_URL (masked): $(echo \"$DATABASE_URL\" | sed -E 's#//([^:]+):([^@]+)@#//\\1:****@#')\"; \
  npx prisma generate && \
  npx prisma migrate deploy && \
  node server.cjs \
"]
