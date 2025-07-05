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

# Generate Prisma client
RUN npx prisma generate

# Apply migrations
RUN npx prisma migrate deploy

# Build Next.js for production
RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "--unhandled-rejections=strict", "--trace-uncaught", "server.js"]
