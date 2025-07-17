FROM node:18

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Accept build-time environment variables from Northflank
ARG DATABASE_URL
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ARG RECAPTCHA_SECRET_KEY

ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV RECAPTCHA_SECRET_KEY=$RECAPTCHA_SECRET_KEY

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build Next.js for production (with env vars available)
RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["sh", "-c", "DATABASE_URL=\"mysql://$USERNAME:$PASSWORD@$HOST:$DB_PORT/$DATABASE?sslaccept=strict\" && echo DATABASE_URL=$DATABASE_URL && npx prisma generate && npx prisma migrate deploy && node server.cjs"]
