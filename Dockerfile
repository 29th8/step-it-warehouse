# =============================================================
# STAGE 1: Install dependencies
# =============================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci


# =============================================================
# STAGE 2: Build the application
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build


# =============================================================
# STAGE 3: Production runtime
# =============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs


# Copy Next.js standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma schema
COPY --from=builder /app/prisma ./prisma

# IMPORTANT: copy full node_modules for Prisma CLI
COPY --from=builder /app/node_modules ./node_modules


# Copy entrypoint
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh


# Set permissions
RUN chown -R nextjs:nodejs /app

USER nextjs


EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0


ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]