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

COPY --from=builder /app/frontend/.next/standalone ./
COPY --from=builder /app/frontend/.next/static ./.next/static
COPY --from=builder /app/frontend/public ./public

RUN chown -R app:app /app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER app

# ✅ Correct entrypoint
CMD ["node", "frontend/server.js"]