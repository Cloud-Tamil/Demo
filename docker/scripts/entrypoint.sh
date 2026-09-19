#!/usr/bin/env bash
# ==============================================================================
# Container Entrypoint Script for PHP-FPM / CLI
# ==============================================================================

set -eo pipefail

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] [entrypoint] $*"
}

cd /var/www/html

# If the command starts with php-fpm, handle initialization
if [ "$1" = "php-fpm" ]; then
    log "Container starting in PHP-FPM service mode."
    
    # Run installation script asynchronously or synchronously if not present
    if [ ! -f "/var/www/html/app/etc/env.php" ]; then
        log "First run detected - starting automated installation in background..."
        /usr/local/bin/install-magento.sh &
    fi

    log "Starting PHP-FPM worker pool..."
    exec "$@"
fi

# Otherwise execute custom command directly (e.g. bash, php bin/magento ...)
exec "$@"
