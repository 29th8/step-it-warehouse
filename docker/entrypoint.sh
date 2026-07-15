#!/bin/sh
set -e

echo "========================================="
echo "  [ENTRYPOINT] Running Prisma Migrations..."
echo "========================================="
npx prisma migrate deploy

echo "========================================="
echo "  [ENTRYPOINT] Starting Next.js Server..."
echo "========================================="
exec "$@"
