#!/bin/bash
set -euo pipefail

# Keep the running and rollback images. Everything else is disposable deployment data.
PROJECT_DIR=${1:-$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}
APP_CONTAINER=${APP_CONTAINER_NAME:-warehouse-app}
IMAGE_REPOSITORY=${DEPLOY_IMAGE_REPOSITORY:-ghcr.io/29th8/step-it-warehouse}
MIN_FREE_KB=${MIN_FREE_KB:-6291456}

current_image=$(cat "$PROJECT_DIR/.deploy/current-image" 2>/dev/null || true)
previous_image=$(cat "$PROJECT_DIR/.deploy/previous-image" 2>/dev/null || true)
running_image=$(docker inspect --format '{{.Config.Image}}' "$APP_CONTAINER" 2>/dev/null || true)

keep_image() {
  local image=$1
  [ -n "$image" ] && {
    [ "$image" = "$current_image" ] || [ "$image" = "$previous_image" ] || [ "$image" = "$running_image" ]
  }
}

echo "Cleaning Docker build cache older than 7 days ..."
docker builder prune --force --filter until=168h >/dev/null

available_kb=$(df -Pk "$PROJECT_DIR" | awk 'NR == 2 { print $4 }')
if [ "${available_kb:-0}" -lt "$MIN_FREE_KB" ]; then
  echo "Docker space is below the threshold; removing all unused build cache ..."
  docker builder prune --all --force >/dev/null
fi

echo "Removing unused application images while preserving current and rollback images ..."
while IFS= read -r image; do
  [ -n "$image" ] || continue
  if ! keep_image "$image"; then
    docker image rm "$image" >/dev/null 2>&1 || true
  fi
done < <(docker image ls "$IMAGE_REPOSITORY" --format '{{.Repository}}:{{.Tag}}')

docker image prune --force >/dev/null

available_kb=$(df -Pk "$PROJECT_DIR" | awk 'NR == 2 { print $4 }')
if [ "${available_kb:-0}" -lt "$MIN_FREE_KB" ]; then
  echo "Insufficient disk space after Docker cleanup. Available: ${available_kb:-0} KB" >&2
  exit 20
fi

echo "Docker cleanup completed. Available: ${available_kb} KB"
