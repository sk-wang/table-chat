# Frontend Dockerfile for TableChat - Multi-stage build

# Stage 1: Build the frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy only package.json (avoid lock file with private registry)
COPY frontend/package.json ./

# Set public registry for pnpm
RUN pnpm config set registry https://registry.npmjs.org/

# Install dependencies with pnpm (much faster than npm)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY frontend/ .

# Build the application
RUN pnpm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

