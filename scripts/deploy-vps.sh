#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
PROJECT_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)
DEPLOY_IMAGE=${1:-${APP_IMAGE:-}}
APP_CONTAINER=${APP_CONTAINER_NAME:-warehouse-app}
HEALTH_TIMEOUT_SECONDS=${HEALTH_TIMEOUT_SECONDS:-180}
STATE_DIR="$PROJECT_DIR/.deploy"
LOCK_FILE=${DEPLOY_LOCK_FILE:-/tmp/step-it-warehouse-deploy.lock}

if [ -z "$DEPLOY_IMAGE" ]; then
  echo "Usage: $0 <full-image-reference>" >&2
  exit 2
fi

if [ ! -f "$PROJECT_DIR/.env" ]; then
  echo "Missing production environment file: $PROJECT_DIR/.env" >&2
  exit 2
fi

command -v docker >/dev/null 2>&1 || {
  echo "Docker is not installed." >&2
  exit 2
}
command -v flock >/dev/null 2>&1 || {
  echo "flock is not installed (package util-linux)." >&2
  exit 2
}

docker compose version >/dev/null
mkdir -p "$STATE_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deployment is already running." >&2
  exit 3
fi

COMPOSE=(docker compose --project-directory "$PROJECT_DIR" -f "$PROJECT_DIR/docker-compose.yml")

container_health() {
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$APP_CONTAINER" 2>/dev/null || true
}

wait_for_app() {
  local elapsed=0
  local status=""

  while [ "$elapsed" -lt "$HEALTH_TIMEOUT_SECONDS" ]; do
    status=$(container_health)
    echo "Application health: ${status:-not-created} (${elapsed}s/${HEALTH_TIMEOUT_SECONDS}s)"

    if [ "$status" = "healthy" ]; then
      return 0
    fi

    sleep 5
    elapsed=$((elapsed + 5))
  done

  return 1
}

rollback_app() {
  local previous_image=$1

  if [ -z "$previous_image" ] || [ "$previous_image" = "$DEPLOY_IMAGE" ]; then
    echo "No previous application image is available for automatic rollback." >&2
    return 1
  fi

  echo "Rolling application back to $previous_image ..."
  APP_IMAGE="$previous_image" "${COMPOSE[@]}" up -d --no-deps --force-recreate warehouse-app

  if wait_for_app; then
    printf '%s\n' "$previous_image" > "$STATE_DIR/current-image"
    echo "Application rollback completed. Database was not restored automatically."
    return 0
  fi

  echo "Rollback image also failed its health check." >&2
  return 1
}

PREVIOUS_IMAGE=$(docker inspect --format '{{.Config.Image}}' "$APP_CONTAINER" 2>/dev/null || true)
printf '%s\n' "$DEPLOY_IMAGE" > "$STATE_DIR/pending-image"

echo "Pulling image $DEPLOY_IMAGE ..."
APP_IMAGE="$DEPLOY_IMAGE" "${COMPOSE[@]}" pull warehouse-app

echo "Creating a database backup before migration ..."
bash "$PROJECT_DIR/scripts/backup.sh"

echo "Running Prisma migrations before replacing the current app ..."
if ! APP_IMAGE="$DEPLOY_IMAGE" "${COMPOSE[@]}" run --rm --no-deps \
  --entrypoint npx warehouse-app prisma migrate deploy; then
  echo "Migration failed. The currently running application was not replaced." >&2
  exit 4
fi

echo "Starting application image $DEPLOY_IMAGE ..."
if ! APP_IMAGE="$DEPLOY_IMAGE" "${COMPOSE[@]}" up -d --no-deps --force-recreate warehouse-app; then
  rollback_app "$PREVIOUS_IMAGE" || true
  exit 5
fi

if ! wait_for_app; then
  "${COMPOSE[@]}" logs --tail=120 warehouse-app || true
  rollback_app "$PREVIOUS_IMAGE" || true
  exit 6
fi

if [ -n "$PREVIOUS_IMAGE" ]; then
  printf '%s\n' "$PREVIOUS_IMAGE" > "$STATE_DIR/previous-image"
fi
printf '%s\n' "$DEPLOY_IMAGE" > "$STATE_DIR/current-image"
rm -f "$STATE_DIR/pending-image"

echo "Deployment completed successfully: $DEPLOY_IMAGE"
