#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${WAREHOUSE_PROJECT_DIR:-/opt/apps/warehouse-system}"
DOMAIN="kho.step.com.vn"
LOCK_FILE="${WAREHOUSE_CERT_LOCK:-/tmp/warehouse-certificate-renew.lock}"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Certificate renewal is already running."
  exit 0
fi

cd "$PROJECT_DIR"
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') Checking certificate renewal"
docker compose run --rm --no-deps --entrypoint certbot certbot renew \
  --webroot -w /var/www/certbot --no-random-sleep-on-renew

disk_hash=$(docker exec warehouse-nginx cat "/etc/letsencrypt/live/$DOMAIN/cert.pem" | openssl x509 -outform DER | sha256sum | cut -d' ' -f1)
served_hash=$(timeout 15 openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -outform DER | sha256sum | cut -d' ' -f1)

if [ "$disk_hash" != "$served_hash" ]; then
  echo "Certificate changed; validating and reloading Nginx."
  docker exec warehouse-nginx nginx -t
  docker exec warehouse-nginx nginx -s reload
else
  echo "Nginx already serves the current certificate."
fi
