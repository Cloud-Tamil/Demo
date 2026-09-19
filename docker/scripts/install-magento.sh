#!/usr/bin/env bash
# ==============================================================================
# Automated Zero-Touch Idempotent Magento 2 Installer
# ==============================================================================

set -euo pipefail

cd /var/www/html

log() {
    echo -e "\033[34m[$(date +'%Y-%m-%d %H:%M:%S')] [install-magento]\033[0m $*"
}

# Wait for all prerequisite services first
/usr/local/bin/wait-for-service.sh

# Check if Magento is already installed
ENV_FILE="/var/www/html/app/etc/env.php"
ALREADY_INSTALLED=0

if [ -f "${ENV_FILE}" ]; then
    if php bin/magento status 2>&1 | grep -q "Magento is installed"; then
        ALREADY_INSTALLED=1
    fi
fi

if [ "${ALREADY_INSTALLED}" -eq 1 ]; then
    log "Magento is already installed. Running idempotent schema upgrade & cache refresh..."
    php bin/magento setup:upgrade --keep-generated
    php bin/magento cache:flush
    log "Idempotent upgrade completed."
    exit 0
fi

log "Initiating zero-touch automated Magento 2 installation..."

# Ensure permissions on critical directories
mkdir -p generated/code generated/metadata var/cache var/page_cache var/log var/tmp pub/static pub/media
chmod -R 775 generated var pub/static pub/media 2>/dev/null || true

# Execute Magento setup:install with full environment parametrization
php bin/magento setup:install \
    --base-url="${MAGENTO_BASE_URL:-http://localhost/}" \
    --backend-frontname="${MAGENTO_ADMIN_FRONTNAME:-admin_secret}" \
    --db-host="${MYSQL_HOST:-mysql}:${MYSQL_PORT:-3306}" \
    --db-name="${MYSQL_DATABASE:-magento}" \
    --db-user="${MYSQL_USER:-magento}" \
    --db-password="${MYSQL_PASSWORD:-MagentoDbSecurePass123!}" \
    --admin-firstname="${MAGENTO_ADMIN_FIRSTNAME:-System}" \
    --admin-lastname="${MAGENTO_ADMIN_LASTNAME:-Administrator}" \
    --admin-email="${MAGENTO_ADMIN_EMAIL:-admin@example.com}" \
    --admin-user="${MAGENTO_ADMIN_USER:-admin}" \
    --admin-password="${MAGENTO_ADMIN_PASSWORD:-AdminSecurePassword123!}" \
    --language="${MAGENTO_LANGUAGE:-en_US}" \
    --currency="${MAGENTO_CURRENCY:-USD}" \
    --timezone="${MAGENTO_TIMEZONE:-UTC}" \
    --use-rewrites="${MAGENTO_USE_REWRITES:-1}" \
    --search-engine=opensearch \
    --opensearch-host="${OPENSEARCH_HOST:-opensearch}" \
    --opensearch-port="${OPENSEARCH_PORT:-9200}" \
    --opensearch-index-prefix="${OPENSEARCH_INDEX_PREFIX:-magento2}" \
    --session-save=redis \
    --session-save-redis-host="${REDIS_HOST:-redis}" \
    --session-save-redis-port="${REDIS_PORT:-6379}" \
    --session-save-redis-db="${REDIS_SESSION_DB:-0}" \
    --session-save-redis-max-concurrency=20 \
    --cache-backend=redis \
    --cache-backend-redis-server="${REDIS_HOST:-redis}" \
    --cache-backend-redis-port="${REDIS_PORT:-6379}" \
    --cache-backend-redis-db="${REDIS_CACHE_DB:-1}" \
    --page-cache=redis \
    --page-cache-redis-server="${REDIS_HOST:-redis}" \
    --page-cache-redis-port="${REDIS_PORT:-6379}" \
    --page-cache-redis-db="${REDIS_PAGE_CACHE_DB:-2}" \
    --amqp-host="${RABBITMQ_HOST:-rabbitmq}" \
    --amqp-port="${RABBITMQ_PORT:-5672}" \
    --amqp-user="${RABBITMQ_USER:-magento}" \
    --amqp-password="${RABBITMQ_PASSWORD:-RabbitSecurePass123!}" \
    --amqp-virtualhost="${RABBITMQ_VHOST:-/magento}" \
    --no-interaction

log "Magento setup:install completed successfully."

# Enable all modules including our custom modules
log "Enabling modules..."
php bin/magento module:enable --all || true

# Set deployment mode based on environment
MAGE_MODE="${MAGE_MODE:-developer}"
log "Setting deployment mode: ${MAGE_MODE}"
php bin/magento deploy:mode:set "${MAGE_MODE}" --skip-compilation

if [ "${MAGE_MODE}" = "production" ]; then
    log "Production mode selected: running DI compile and static asset deployment..."
    php bin/magento setup:di:compile
    php bin/magento setup:static-content:deploy -f
fi

# Enable and reindex catalog
log "Running indexer and cache warm..."
php bin/magento indexer:reindex
php bin/magento cache:enable
php bin/magento cache:flush

log "============================================================"
log "   Magento 2 Installation & Initialization Complete!        "
log "   Storefront: ${MAGENTO_BASE_URL:-http://localhost/}       "
log "   Admin URL:  ${MAGENTO_BASE_URL:-http://localhost/}${MAGENTO_ADMIN_FRONTNAME:-admin_secret}"
log "============================================================"
