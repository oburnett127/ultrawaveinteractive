# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:20.11.1 AS builder

WORKDIR /app

# 1️⃣ Copy workspace manifests FIRST (CRITICAL)
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# 2️⃣ Install deps (includes frontend devDeps like `next`)
RUN npm ci

# 3️⃣ Copy frontend source
COPY frontend ./frontend

# 4️⃣ Build-time public env (NON-SECRET)
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SQUARE_APP_ID
ARG NEXT_PUBLIC_SQUARE_LOCATION_ID
ARG NEXT_PUBLIC_BACKEND_URL

ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_SQUARE_APP_ID=$NEXT_PUBLIC_SQUARE_APP_ID
ENV NEXT_PUBLIC_SQUARE_LOCATION_ID=$NEXT_PUBLIC_SQUARE_LOCATION_ID
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

# 5️⃣ Build Next.js
WORKDIR /app/frontend
RUN npm run build


# =====================================================
# 🚀 STAGE 2 — Runtime (NON-ROOT)
# =====================================================
FROM node:20.11.1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# 👤 Create non-root user
RUN groupadd -r app && useradd -r -g app app

# ✅ Create writable home for npm
RUN mkdir -p /home/app/.npm && chown -R app:app /home/app

EXPOSE 3000

# ❤️ Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Copy manifests
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/frontend/package.json ./frontend/package.json

# Install prod deps only
RUN npm ci --omit=dev && npm cache clean --force

# Copy runtime artifacts
COPY --from=builder --chown=app:app /app/frontend/.next ./frontend/.next
COPY --from=builder --chown=app:app /app/frontend/public ./frontend/public
COPY --from=builder --chown=app:app /app/frontend/next.config.js ./frontend/next.config.js

# Drop privileges
USER app

# Start Next.js
WORKDIR /app/frontend
CMD ["npm", "run", "start"]

