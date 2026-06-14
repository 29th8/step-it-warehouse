#!/bin/sh
set -e

echo "========================================="
echo "  [ENTRYPOINT] Running Prisma DB Push..."
echo "========================================="
npx prisma db push --accept-data-loss

echo "========================================="
echo "  [ENTRYPOINT] Starting Next.js Server..."
echo "========================================="
exec "$@"
