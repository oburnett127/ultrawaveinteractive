# =====================================================
# 🧱 STAGE 1 — Builder
# =====================================================
FROM node:20.11.1 AS builder


WORKDIR /app

# -----------------------------------------------------
# 1️⃣ Install root deps (cached)
# -----------------------------------------------------
COPY package*.json ./
RUN npm ci

# -----------------------------------------------------
# 2️⃣ Copy frontend source
# -----------------------------------------------------
COPY frontend ./frontend

# -----------------------------------------------------
# 3️⃣ Build-time public env (NON-SECRET)
# -----------------------------------------------------
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SQUARE_APP_ID
ARG NEXT_PUBLIC_SQUARE_LOCATION_ID

ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_SQUARE_APP_ID=$NEXT_PUBLIC_SQUARE_APP_ID
ENV NEXT_PUBLIC_SQUARE_LOCATION_ID=$NEXT_PUBLIC_SQUARE_LOCATION_ID

# -----------------------------------------------------
# 4️⃣ Build Next.js (from frontend dir)
# -----------------------------------------------------
WORKDIR /app/frontend
RUN npm run build

# -----------------------------------------------------
# 5️⃣ Remove devDependencies
# -----------------------------------------------------
WORKDIR /app
RUN npm prune --omit=dev


# =====================================================
# 🚀 STAGE 2 — Runtime (NON-ROOT)
# =====================================================
FROM node:20.11.1-slim AS runner

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
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# -----------------------------------------------------
# Copy runtime artifacts (owned by app)
# -----------------------------------------------------
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/frontend/.next ./frontend/.next
COPY --from=builder --chown=app:app /app/frontend/public ./frontend/public
COPY --from=builder --chown=app:app /app/frontend/package.json ./frontend/package.json

# -----------------------------------------------------
# Drop privileges
# -----------------------------------------------------
USER app

# -----------------------------------------------------
# Start Next.js
# -----------------------------------------------------
WORKDIR /app/frontend
CMD ["npm", "run", "start"]
