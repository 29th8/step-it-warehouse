#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS_ON_START:-true}" = "true" ]; then
  echo "========================================="
  echo "  [ENTRYPOINT] Running Prisma Migrations..."
  echo "========================================="
  npx prisma migrate deploy
else
  echo "[ENTRYPOINT] Prisma migration is managed by the deploy pipeline."
fi

echo "========================================="
echo "  [ENTRYPOINT] Starting Next.js Server..."
echo "========================================="
exec "$@"
