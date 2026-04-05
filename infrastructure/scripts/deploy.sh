#!/bin/bash
set -e

# VSaaS Production Deployment Script
# Usage: ./deploy.sh [build|up|down|migrate|logs]

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found. Copy .env.production.example and fill in values."
  exit 1
fi

export $(grep -v '^#' $ENV_FILE | xargs)

case "$1" in
  build)
    echo "Building Docker images..."
    docker compose -f $COMPOSE_FILE build --parallel
    ;;
  up)
    echo "Starting services..."
    docker compose -f $COMPOSE_FILE up -d
    echo "Running database migrations..."
    docker compose -f $COMPOSE_FILE exec api pnpm --filter @vsaas/database migrate:prod
    echo "Services are up!"
    docker compose -f $COMPOSE_FILE ps
    ;;
  down)
    echo "Stopping services..."
    docker compose -f $COMPOSE_FILE down
    ;;
  migrate)
    echo "Running database migrations..."
    docker compose -f $COMPOSE_FILE exec api pnpm --filter @vsaas/database migrate:prod
    ;;
  logs)
    docker compose -f $COMPOSE_FILE logs -f ${2:-}
    ;;
  restart)
    echo "Restarting ${2:-all services}..."
    docker compose -f $COMPOSE_FILE restart ${2:-}
    ;;
  seed)
    echo "Seeding database..."
    docker compose -f $COMPOSE_FILE exec api pnpm --filter @vsaas/database seed
    ;;
  *)
    echo "Usage: $0 {build|up|down|migrate|logs|restart|seed}"
    echo ""
    echo "Commands:"
    echo "  build    - Build all Docker images"
    echo "  up       - Start all services and run migrations"
    echo "  down     - Stop all services"
    echo "  migrate  - Run database migrations"
    echo "  logs     - View logs (optional: service name)"
    echo "  restart  - Restart services (optional: service name)"
    echo "  seed     - Seed database with initial data"
    exit 1
    ;;
esac
