# =========================
# 🧱 Builder
# =========================
FROM node:20.11.1 AS builder

# 👇 DECLARE BUILD ARGS
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SQUARE_LOCATION_ID

# 👇 EXPOSE THEM TO NEXT BUILD
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SQUARE_LOCATION_ID=$NEXT_PUBLIC_SQUARE_LOCATION_ID

WORKDIR /app

# Root lockfile controls everything
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

RUN npm ci

COPY frontend ./frontend

WORKDIR /app/frontend
RUN npm run build

# =========================
# 🚀 Runtime
# =========================
FROM node:20.11.1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN groupadd -r app && useradd -r -g app app

# Copy app + deps
COPY --from=builder /app/frontend ./frontend
COPY --from=builder /app/node_modules ./node_modules

RUN chown -R app:app /app

EXPOSE 3000

USER app

WORKDIR /app/frontend

# ✅ NO npx
CMD ["node", "../node_modules/next/dist/bin/next", "start", "-p", "3000"]

