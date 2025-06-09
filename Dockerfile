# Use the official Node LTS base image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's code
COPY . .

# Build Next.js for production
RUN npm run build

# Expose the port your app will run on (Northflank uses 8080 by default)
EXPOSE 8080

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Start the unified app
CMD ["npm", "start"]
