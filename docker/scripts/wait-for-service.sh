#!/usr/bin/env bash
# ==============================================================================
# Service Waiter Script for Magento 2 Dependencies
# Ensures MySQL, Redis, OpenSearch, and RabbitMQ are fully available before setup
# ==============================================================================

set -euo pipefail

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [wait-for-service] $*"
}

# 1. Wait for MySQL
MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-magento}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-MagentoDbSecurePass123!}"

log "Waiting for MySQL at ${MYSQL_HOST}:${MYSQL_PORT}..."
until mariadb-admin ping -h"${MYSQL_HOST}" -P"${MYSQL_PORT}" -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" --silent > /dev/null 2>&1; do
    sleep 2
done
log "MySQL is ready and accepting queries."

# 2. Wait for Redis
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

log "Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
until php -r "
    \$r = new Redis();
    if (@\$r->connect('${REDIS_HOST}', (int)'${REDIS_PORT}', 2.0)) {
        exit(0);
    }
    exit(1);
"; do
    sleep 2
done
log "Redis is ready."

# 3. Wait for OpenSearch
OPENSEARCH_HOST="${OPENSEARCH_HOST:-opensearch}"
OPENSEARCH_PORT="${OPENSEARCH_PORT:-9200}"

log "Waiting for OpenSearch at ${OPENSEARCH_HOST}:${OPENSEARCH_PORT}..."
until curl -sf "http://${OPENSEARCH_HOST}:${OPENSEARCH_PORT}/_cluster/health" > /dev/null 2>&1; do
    sleep 3
done
log "OpenSearch is ready."

# 4. Wait for RabbitMQ
RABBITMQ_HOST="${RABBITMQ_HOST:-rabbitmq}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"

log "Waiting for RabbitMQ at ${RABBITMQ_HOST}:${RABBITMQ_PORT}..."
until php -r "
    \$fp = @fsockopen('${RABBITMQ_HOST}', (int)'${RABBITMQ_PORT}', \$errno, \$errstr, 2);
    if (\$fp) {
        fclose(\$fp);
        exit(0);
    }
    exit(1);
"; do
    sleep 2
done
log "RabbitMQ AMQP port is open."
log "All external dependencies are healthy!"
