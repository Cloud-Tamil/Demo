#!/usr/bin/env bash
# ==============================================================================
# Magento 2 Message Queue Consumers Supervisor
# Runs long-lived consumer processes for RabbitMQ AMQP message handling
# ==============================================================================

set -euo pipefail

cd /var/www/html

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [consumer-supervisor] $*"
}

log "Waiting for Magento installation before starting consumers..."
until [ -f "/var/www/html/app/etc/env.php" ]; do
    sleep 5
done

terminate() {
    log "Received shutdown signal. Stopping consumers gracefully..."
    kill 0
    exit 0
}

trap terminate SIGINT SIGTERM

log "Launching async queue consumers..."

# Standard Magento message consumers
CONSUMERS=(
    "async.operations.all"
    "exportProcessor"
    "inventory.reservations.update"
    "inventory.reservations.cleanup"
)

for consumer in "${CONSUMERS[@]}"; do
    log "Starting consumer: ${consumer}"
    (
        while true; do
            php bin/magento queue:consumers:start "${consumer}" --max-messages=100 || true
            sleep 2
        done
    ) &
done

log "All queue consumers launched in supervisor loop."
wait
