# Node 22 LTS (Node 20 reached end of life in April 2026)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./
# Uncomment the next line if you use pnpm and have pnpm-lock.yaml
# COPY pnpm-lock.yaml ./

# Install exactly what package-lock.json pins (choose npm or pnpm)
RUN npm ci
# If using pnpm, replace with:
# RUN npm install -g pnpm && pnpm install

# Copy all project files
COPY . .

# The build needs no secrets or database: pass every variable at runtime (FINNHUB_API_KEY, not NEXT_PUBLIC_*,
# which Next.js freezes at build time and would record in the image layers).
# The one setting the browser needs at build time, and not a secret: "cached" (hourly quotes, the default) or
# "realtime" (every 15 seconds, with price alerts). docker compose passes it from .env.
ARG NEXT_PUBLIC_OPENSTOCK_DATA_MODE=cached
ENV NEXT_PUBLIC_OPENSTOCK_DATA_MODE=$NEXT_PUBLIC_OPENSTOCK_DATA_MODE

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
