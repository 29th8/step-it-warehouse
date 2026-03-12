#!/bin/sh
# =============================================
# Cron Worker: Gọi API rental-monitor mỗi 8h sáng
# Container này KHÔNG chạy Next.js server
# =============================================
set -e

CRON_URL="http://warehouse-app:3000/api/cron/rental-monitor"
LOG_FILE="/app/logs/cron.log"

mkdir -p /app/logs

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cron worker started" >> "$LOG_FILE"

while true; do
  # Tính thời gian chờ đến 8:00 AM
  CURRENT_HOUR=$(date +%H)
  CURRENT_MIN=$(date +%M)
  CURRENT_SEC=$(date +%S)

  # Nếu đã qua 8h, chạy ngay lần đầu rồi chờ đến 8h ngày mai
  TARGET_HOUR=8
  TARGET_MIN=0

  CURRENT_TOTAL=$((CURRENT_HOUR * 3600 + CURRENT_MIN * 60 + CURRENT_SEC))
  TARGET_TOTAL=$((TARGET_HOUR * 3600 + TARGET_MIN * 60))

  if [ "$CURRENT_TOTAL" -ge "$TARGET_TOTAL" ]; then
    WAIT_SECONDS=$(( 86400 - CURRENT_TOTAL + TARGET_TOTAL ))
  else
    WAIT_SECONDS=$(( TARGET_TOTAL - CURRENT_TOTAL ))
  fi

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Next run in ${WAIT_SECONDS}s" >> "$LOG_FILE"
  sleep "$WAIT_SECONDS"

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running rental monitor cron..." >> "$LOG_FILE"

  # Gọi API cron (retry 3 lần)
  RETRY=0
  MAX_RETRY=3
  while [ "$RETRY" -lt "$MAX_RETRY" ]; do
    RESPONSE=$(wget -qO- --timeout=30 "$CRON_URL" 2>&1) && break
    RETRY=$((RETRY + 1))
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Retry $RETRY/$MAX_RETRY..." >> "$LOG_FILE"
    sleep 10
  done

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Response: $RESPONSE" >> "$LOG_FILE"
done
