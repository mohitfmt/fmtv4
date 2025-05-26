# Stage 1: Dependencies
# Using Node.js 22.16 LTS for better memory management and security
# Alpine variant uses musl libc which aggressively returns memory to OS
FROM node:22.16-alpine AS deps

# Install build dependencies and memory debugging tools
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    # Memory profiling tools for development/debugging
    # These won't be in the final image but help during build
    linux-headers \
    build-base

WORKDIR /app

# Copy package files and prisma schema first (for better caching)
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install dependencies with legacy peer deps flag for compatibility
RUN npm ci --legacy-peer-deps --ignore-optional

# Stage 2: Builder
# Using the same Node.js version for consistency
FROM node:22.16-alpine AS builder
WORKDIR /app

# Define all build-time arguments
# NEXT_PUBLIC_* variables are embedded in the client-side bundle
ARG NEXT_PUBLIC_COMSCORE_ID
ARG NEXT_PUBLIC_LOTAME_CLIENT_ID
ARG NEXT_PUBLIC_CB_UID
ARG NEXT_PUBLIC_CHARTBEAT_API_KEY
ARG NEXT_PUBLIC_CHARTBEAT_HOST
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_CDN_URL
ARG NEXT_PUBLIC_GCS_BUCKET
ARG NEXT_PUBLIC_CMS_URL
ARG NEXT_PUBLIC_DOMAIN
ARG NEXT_PUBLIC_CRYPTO_IV
ARG NEXT_PUBLIC_CRYPTO_KEY
ARG NEXT_PUBLIC_WP_REFRESH_TOKEN
ARG NEXT_PUBLIC_WORDPRESS_SECRET

# Server-side only build arguments
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG WORDPRESS_API_URL
ARG REVALIDATE_SECRET_KEY

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DEBUG_MEMORY="true"

# Pass build args to environment for Next.js build process
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV WORDPRESS_API_URL=${WORDPRESS_API_URL}
ENV REVALIDATE_SECRET_KEY=${REVALIDATE_SECRET_KEY}
ENV NEXT_PUBLIC_COMSCORE_ID=${NEXT_PUBLIC_COMSCORE_ID}
ENV NEXT_PUBLIC_LOTAME_CLIENT_ID=${NEXT_PUBLIC_LOTAME_CLIENT_ID}
ENV NEXT_PUBLIC_CB_UID=${NEXT_PUBLIC_CB_UID}
ENV NEXT_PUBLIC_CHARTBEAT_API_KEY=${NEXT_PUBLIC_CHARTBEAT_API_KEY}
ENV NEXT_PUBLIC_CHARTBEAT_HOST=${NEXT_PUBLIC_CHARTBEAT_HOST}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_CDN_URL=${NEXT_PUBLIC_CDN_URL}
ENV NEXT_PUBLIC_GCS_BUCKET=${NEXT_PUBLIC_GCS_BUCKET}
ENV NEXT_PUBLIC_CMS_URL=${NEXT_PUBLIC_CMS_URL}
ENV NEXT_PUBLIC_DOMAIN=${NEXT_PUBLIC_DOMAIN}
ENV NEXT_PUBLIC_CRYPTO_IV=${NEXT_PUBLIC_CRYPTO_IV}
ENV NEXT_PUBLIC_CRYPTO_KEY=${NEXT_PUBLIC_CRYPTO_KEY}
ENV NEXT_PUBLIC_WP_REFRESH_TOKEN=${NEXT_PUBLIC_WP_REFRESH_TOKEN}
ENV NEXT_PUBLIC_WORDPRESS_SECRET=${NEXT_PUBLIC_WORDPRESS_SECRET}

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy all source files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
# This creates the standalone output in .next/standalone
RUN npm run build

# Stage 3: Runner
# Using the same Node.js version to ensure compatibility
# The newer V8 engine in Node 22 has better memory management
FROM node:22.16-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DEBUG_MEMORY="true"

# Memory management configuration
# --expose-gc: Allows manual garbage collection triggering
# --max-old-space-size=1792: Limits heap to 1.75GB (leaving room for OS in 2GB container)
# --optimize-for-size: Prefers smaller memory footprint over execution speed
ENV NODE_OPTIONS="--expose-gc --max-old-space-size=1792 --optimize-for-size"
ENV PORT=3000

# Install production runtime dependencies for memory monitoring
RUN apk add --no-cache \
    # For health checks and debugging
    curl \
    # Process monitoring capabilities
    procps \
    # Memory analysis tools (small overhead, big debugging value)
    htop

# Runtime arguments for all environment variables
ARG WORDPRESS_API_URL
ARG NEXT_PUBLIC_WP_REFRESH_TOKEN
ARG NEXT_PUBLIC_WORDPRESS_SECRET
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG NEXT_PUBLIC_DOMAIN
ARG REVALIDATE_SECRET_KEY
ARG GOOGLE_CLIENT_SECRET
ARG REVALIDATION_TOKEN
ARG SYNC_KEY
ARG CLOUDFLARE_API_TOKEN
ARG CLOUDFLARE_ZONE_ID
ARG CHARTBEAT_API_KEY
ARG CHARTBEAT_HOST
ARG YOUTUBE_API_KEY
ARG SENDGRID_API_KEY
ARG CONTACT_US_RECIPIENT
ARG NEXT_PUBLIC_COMSCORE_ID
ARG NEXT_PUBLIC_LOTAME_CLIENT_ID
ARG NEXT_PUBLIC_CB_UID
ARG NEXT_PUBLIC_CHARTBEAT_API_KEY
ARG NEXT_PUBLIC_CHARTBEAT_HOST
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_CDN_URL
ARG NEXT_PUBLIC_GCS_BUCKET
ARG NEXT_PUBLIC_CMS_URL
ARG NEXT_PUBLIC_CRYPTO_IV
ARG NEXT_PUBLIC_CRYPTO_KEY

# Set all runtime environment variables
ENV WORDPRESS_API_URL=${WORDPRESS_API_URL}
ENV NEXT_PUBLIC_WP_REFRESH_TOKEN=${NEXT_PUBLIC_WP_REFRESH_TOKEN}
ENV NEXT_PUBLIC_WORDPRESS_SECRET=${NEXT_PUBLIC_WORDPRESS_SECRET}
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXT_PUBLIC_DOMAIN=${NEXT_PUBLIC_DOMAIN}
ENV REVALIDATE_SECRET_KEY=${REVALIDATE_SECRET_KEY}
ENV GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
ENV REVALIDATION_TOKEN=${REVALIDATION_TOKEN}
ENV SYNC_KEY=${SYNC_KEY}
ENV CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}
ENV CLOUDFLARE_ZONE_ID=${CLOUDFLARE_ZONE_ID}
ENV CHARTBEAT_API_KEY=${CHARTBEAT_API_KEY}
ENV CHARTBEAT_HOST=${CHARTBEAT_HOST}
ENV YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
ENV SENDGRID_API_KEY=${SENDGRID_API_KEY}
ENV CONTACT_US_RECIPIENT=${CONTACT_US_RECIPIENT}
ENV NEXT_PUBLIC_COMSCORE_ID=${NEXT_PUBLIC_COMSCORE_ID}
ENV NEXT_PUBLIC_LOTAME_CLIENT_ID=${NEXT_PUBLIC_LOTAME_CLIENT_ID}
ENV NEXT_PUBLIC_CB_UID=${NEXT_PUBLIC_CB_UID}
ENV NEXT_PUBLIC_CHARTBEAT_API_KEY=${NEXT_PUBLIC_CHARTBEAT_API_KEY}
ENV NEXT_PUBLIC_CHARTBEAT_HOST=${NEXT_PUBLIC_CHARTBEAT_HOST}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_CDN_URL=${NEXT_PUBLIC_CDN_URL}
ENV NEXT_PUBLIC_GCS_BUCKET=${NEXT_PUBLIC_GCS_BUCKET}
ENV NEXT_PUBLIC_CMS_URL=${NEXT_PUBLIC_CMS_URL}
ENV NEXT_PUBLIC_CRYPTO_IV=${NEXT_PUBLIC_CRYPTO_IV}
ENV NEXT_PUBLIC_CRYPTO_KEY=${NEXT_PUBLIC_CRYPTO_KEY}

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create required directories with proper permissions
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next

# Copy only necessary files from builder
# Public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Standalone server (includes node_modules required for production)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ ./

# Static files (JS, CSS, media)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Configuration files
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/prisma ./prisma

# Switch to non-root user
USER nextjs

# Expose the application port
EXPOSE 3000

# Start the Next.js standalone server with garbage collection exposed
CMD ["node", "--expose-gc", "server.js"]
