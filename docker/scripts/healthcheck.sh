#!/usr/bin/env bash
# ==============================================================================
# Healthcheck Script for PHP-FPM & Magento Health
# ==============================================================================

set -euo pipefail

# 1. Check PHP-FPM process ping
php-fpm-healthcheck || exit 1

# 2. If Magento installed, verify DB connectivity
if [ -f "/var/www/html/app/etc/env.php" ]; then
    php -r "
        try {
            require '/var/www/html/app/bootstrap.php';
            exit(0);
        } catch (\Throwable \$e) {
            exit(1);
        }
    " || exit 1
fi

exit 0
