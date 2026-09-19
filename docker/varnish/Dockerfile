# ==============================================================================
# Production Varnish 7.4 Dockerfile
# ==============================================================================

FROM varnish:7.4-alpine

COPY docker/varnish/default.vcl /etc/varnish/default.vcl

ENV VARNISH_SIZE=512M

EXPOSE 80

CMD ["varnishd", "-F", "-f", "/etc/varnish/default.vcl", "-s", "malloc,${VARNISH_SIZE}", "-a", "0.0.0.0:80"]
