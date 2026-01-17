# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:20.11.1 AS builder

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci

COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm run build


# =====================================================
# 🚀 STAGE 2 — Runtime
# =====================================================
FROM node:20.11.1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd -r app && useradd -r -g app app

# Copy entire standalone bundle
COPY --from=builder /app/frontend/.next/standalone ./frontend

# Copy static assets to WHERE THE SERVER EXPECTS THEM
COPY --from=builder /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder /app/frontend/public ./frontend/public

RUN chown -R app:app /app

EXPOSE 3000

USER app

CMD ["node", "frontend/server.js"]
