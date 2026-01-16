#!/bin/bash
set -e

# Load .env file
set -a
source .env
set +a

echo "Starting database container..."
docker compose up -d db

echo "Waiting for database to be ready..."
sleep 5

echo "Initializing database with user: $POSTGRES_USER"
docker exec -i cookie-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/init.sql

echo "Database initialization complete!"
