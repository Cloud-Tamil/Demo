# ==============================================================================
# Production Nginx Dockerfile for Magento 2
# Alpine-based lightweight image optimized for Magento 2 /pub document root
# ==============================================================================

FROM nginx:1.26-alpine

# Install curl and ca-certificates for health checking and TLS
RUN apk add --no-cache curl ca-certificates

# Replace default configuration
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Set workdir to Magento root
WORKDIR /var/www/html

EXPOSE 80 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://127.0.0.1/health_check.php || curl -f http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
