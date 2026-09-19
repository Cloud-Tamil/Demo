#!/usr/bin/env bash
# ==============================================================================
# Magento 2 Containerized Cron Runner Daemon
# Continuously executes bin/magento cron:run every 60 seconds with signal handling
# ==============================================================================

set -euo pipefail

cd /var/www/html

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [cron-runner] $*"
}

# Wait for Magento installation to complete
log "Waiting for Magento installation before launching cron..."
until [ -f "/var/www/html/app/etc/env.php" ]; do
    sleep 5
done

# Signal handling for graceful container termination
terminate() {
    log "Gracefully shutting down cron runner..."
    exit 0
}

trap terminate SIGINT SIGTERM

log "Starting Magento 2 Cron loop (Interval: 60s)..."

while true; do
    log "Dispatching bin/magento cron:run..."
    php bin/magento cron:run 2>&1 | tr "\r\n" " " || true
    echo ""
    sleep 60 &
    wait $!
done
