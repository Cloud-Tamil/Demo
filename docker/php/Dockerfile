# ==============================================================================
# Production Multi-Stage PHP-FPM Dockerfile for Magento 2.4.7
# Fully non-root, includes all required extensions, Composer 2, and health checks
# ==============================================================================

FROM php:8.2-fpm-bookworm AS base

LABEL maintainer="Magento DevOps Engineering Team"
LABEL version="2.4.7-p3"

# Prevent interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies & Magento extension libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    curl \
    git \
    unzip \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libwebp-dev \
    libxml2-dev \
    libxslt1-dev \
    libzip-dev \
    libicu-dev \
    libsodium-dev \
    libonig-dev \
    mariadb-client \
    ghostscript \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure & Install required PHP extensions for Magento 2.4.7
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-configure intl \
    && docker-php-ext-install -j$(nproc) \
        bcmath \
        calendar \
        exif \
        gd \
        intl \
        mysqli \
        opcache \
        pdo_mysql \
        soap \
        sockets \
        sodium \
        xsl \
        zip

# Install Redis extension via PECL
RUN pecl install redis-6.0.2 \
    && docker-php-ext-enable redis

# Install Composer 2 globally
COPY --from=composer:2.7 /usr/bin/composer /usr/local/bin/composer

# Install fcgi health checker tool
RUN curl -o /usr/local/bin/php-fpm-healthcheck \
    https://raw.githubusercontent.com/renatomefi/php-fpm-healthcheck/master/php-fpm-healthcheck \
    && chmod +x /usr/local/bin/php-fpm-healthcheck

# Copy PHP and OPcache configuration
COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-magento.ini
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/10-opcache.ini
COPY docker/php/php-fpm.conf /usr/local/etc/php-fpm.conf
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/www.conf

# Copy utility and automation scripts
COPY docker/scripts/wait-for-service.sh /usr/local/bin/wait-for-service.sh
COPY docker/scripts/install-magento.sh /usr/local/bin/install-magento.sh
COPY docker/scripts/setup-cron.sh /usr/local/bin/setup-cron.sh
COPY docker/scripts/setup-consumers.sh /usr/local/bin/setup-consumers.sh
COPY docker/scripts/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/*.sh

WORKDIR /var/www/html

# Establish non-root ownership
RUN chown -R www-data:www-data /var/www

# Expose FastCGI port
EXPOSE 9000

USER www-data

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
