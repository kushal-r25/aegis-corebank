#!/bin/sh
set -e

echo "Starting Aegis CoreBank Cloud Platform..."

# Replace port in nginx config if $PORT is set by cloud provider
if [ -n "$PORT" ]; then
    sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/conf.d/default.conf
fi

# Start Auth Service
echo "Starting Auth Service on :8081..."
java -Xms64m -Xmx112m -jar /app/auth-service.jar &

# Start Account Service
echo "Starting Account Service on :8082..."
java -Xms64m -Xmx112m -jar /app/account-service.jar &

# Start Transaction Service
echo "Starting Transaction Service on :8083..."
java -Xms64m -Xmx112m -jar /app/transaction-service.jar &

# Start Notification Service
echo "Starting Notification Service on :8084..."
java -Xms48m -Xmx80m -jar /app/notification-service.jar &

# Start Nginx in foreground
echo "Starting Nginx Ingress Gateway..."
exec nginx -g "daemon off;"
