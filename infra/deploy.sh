#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/activites/app"
COMPOSE="/opt/activites/app/infra/docker-compose.yml"
BACKUP="/opt/backups/run_backup.sh"
BRANCH="claude/activity-booking-mvp-qAqhB"

echo "[1/6] Backup..."
sudo "$BACKUP"

echo "[2/6] Git pull..."
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[3/6] Build web image..."
sudo docker compose -f "$COMPOSE" --env-file /opt/activites/app/infra/.env build web

echo "[4/6] Start/Update containers (no downtime if possible)..."
sudo docker compose -f "$COMPOSE" --env-file /opt/activites/app/infra/.env up -d

echo "[5/6] Prisma migrate deploy..."
sudo docker exec -t activites-web npx prisma migrate deploy

echo "[6/6] Done."
sudo docker compose -f "$COMPOSE" --env-file /opt/activites/app/infra/.env ps
