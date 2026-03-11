# Nginx Production Dockerfile
FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create log directory
RUN mkdir -p /var/log/nginx && \
    chmod 755 /var/log/nginx

# Health check - Verify frontend is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost/ > /dev/null 2>&1 || exit 1

# Expose port 80 only (HTTP)
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
