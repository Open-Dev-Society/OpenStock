# Use official Node.js 20 Alpine image as base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./
# Uncomment the next line if you use pnpm and have pnpm-lock.yaml
# COPY pnpm-lock.yaml ./

# Install dependencies (choose npm or pnpm)
RUN npm install
# If using pnpm, replace with:
# RUN npm install -g pnpm && pnpm install

# Copy all project files
COPY . .

# NEXT_PUBLIC_* variables are inlined at build time, so they must be available
# during `npm run build` (Railway passes service variables as build args)
ARG NEXT_PUBLIC_FINNHUB_API_KEY
ENV NEXT_PUBLIC_FINNHUB_API_KEY=$NEXT_PUBLIC_FINNHUB_API_KEY

# Build the Next.js application
RUN npm run build
# Or if using pnpm:
# RUN pnpm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the Next.js production server
CMD ["npm", "start"]
# Or if using pnpm:
# CMD ["pnpm", "start"]
