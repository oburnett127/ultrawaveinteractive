# =================================
# Backend Dockerfile (Express)
# =================================
FROM node:18

WORKDIR /app

ARG CACHE_BREAKER=1

# ---- 1) Install deps ----
COPY package*.json ./
RUN npm ci --omit=optional || npm install

# ---- 2) Prisma client generation (cached) ----
COPY prisma ./prisma
RUN npx prisma generate

# ---- 3) Copy backend source ----
COPY . .

# ---- 4) Runtime config ----
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# ---- 5) Start backend ----
CMD ["sh", "-c", "\
  if [ -z \"$DATABASE_URL\" ]; then \
    echo 'ERROR: DATABASE_URL is not set' >&2; exit 1; \
  fi; \
  echo \"Using DATABASE_URL (masked): $(echo \"$DATABASE_URL\" | sed -E 's#//([^:]+):([^@]+)@#//\\1:****@#')\"; \
  npx prisma generate && \
  npx prisma migrate deploy && \
  node server.cjs \
"]
