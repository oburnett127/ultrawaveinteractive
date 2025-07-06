FROM node:18

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Accept build-time environment variable from Northflank
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Build Next.js for production
RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["sh", "-c", "echo DATABASE_URL=$DATABASE_URL && npx prisma generate && npx prisma migrate deploy && node server.js"]

