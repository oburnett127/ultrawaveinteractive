# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:18 AS builder

WORKDIR /app

# -----------------------------------------------------
# 1️⃣ Install deps
# -----------------------------------------------------
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------
# 2️⃣ Copy frontend source
# -----------------------------------------------------
COPY frontend ./frontend

# -----------------------------------------------------
# 3️⃣ Public build-time env (NON-SECRET)
# -----------------------------------------------------
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SQUARE_APP_ID
ARG NEXT_PUBLIC_SQUARE_LOCATION_ID

ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_SQUARE_APP_ID=$NEXT_PUBLIC_SQUARE_APP_ID
ENV NEXT_PUBLIC_SQUARE_LOCATION_ID=$NEXT_PUBLIC_SQUARE_LOCATION_ID

# -----------------------------------------------------
# 4️⃣ Build Next.js
# -----------------------------------------------------
RUN npm run build --workspace=frontend || npm run build

# -----------------------------------------------------
# 5️⃣ Remove devDependencies
# -----------------------------------------------------
RUN npm prune --omit=dev


# =====================================================
# 🚀 STAGE 2 — Runtime (NON-ROOT)
# =====================================================
FROM node:18-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# -----------------------------------------------------
# 👤 Create non-root user
# -----------------------------------------------------
RUN groupadd -r app && useradd -r -g app app

EXPOSE 3000

# -----------------------------------------------------
# ❤️ Docker healthcheck (frontend liveness)
# -----------------------------------------------------
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# -----------------------------------------------------
# Copy runtime artifacts (owned by app)
# -----------------------------------------------------
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/frontend ./frontend
COPY --from=builder --chown=app:app /app/package.json ./package.json

# -----------------------------------------------------
# Drop privileges
# -----------------------------------------------------
USER app

# -----------------------------------------------------
# Start Next.js (UNCHANGED)
# -----------------------------------------------------
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
