# ================================
# Frontend Dockerfile (Next.js)
# ================================
FROM node:18

WORKDIR /app

ARG CACHE_BREAKER=1

# ---- 1) Install deps (cached) ----
COPY package*.json ./
RUN npm ci --omit=optional || npm install

# ---- 2) Copy source ----
COPY . .

# ---- 3) Public build-time env (SAFE) ----
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG NEXT_PUBLIC_SQUARE_APPLICATION_ID
ARG NEXT_PUBLIC_SQUARE_LOCATION_ID
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_SQUARE_APPLICATION_ID=$NEXT_PUBLIC_SQUARE_APPLICATION_ID
ENV NEXT_PUBLIC_SQUARE_LOCATION_ID=$NEXT_PUBLIC_SQUARE_LOCATION_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# ---- 4) Build Next.js ----
RUN npm run build

# ---- 5) Runtime ----
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
