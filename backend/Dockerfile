FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build   # -> "tsc -p tsconfig.build.json" then outputs to dist/

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy only production dependencies and built code from builder
COPY --from=builder /app/package.json ./
RUN npm ci --omit=dev

# Copy compiled output (dist) and start script
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env .env  # optional; override at runtime

EXPOSE 4000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]