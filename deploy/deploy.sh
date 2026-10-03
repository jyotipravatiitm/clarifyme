#!/usr/bin/env bash
# Runs ON THE VPS (called by GitHub Actions after the code is synced, or by hand):
#   bash ~/clarifyme/deploy/deploy.sh
# Rebuilds and restarts the stack, waits for the app to be healthy, then cleans up.
set -euo pipefail
cd "$(dirname "$0")/.."

log() { printf '\033[1;32m[deploy]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[deploy]\033[0m %s\n' "$*" >&2; exit 1; }

[ -f .env ] || die "Missing $(pwd)/.env. Run deploy/bootstrap.sh on this server first."
command -v docker >/dev/null || die "Docker is not installed. Run deploy/bootstrap.sh first."

# Which reverse proxy fronts the app: our Caddy (default) or the server's own nginx.
mode="$(cat .deploy-mode 2>/dev/null || true)"
if [ -z "$mode" ]; then
  if pgrep -x nginx >/dev/null 2>&1; then mode=nginx; else mode=caddy; fi
  echo "$mode" > .deploy-mode
fi
files=(-f docker-compose.yml)
[ "$mode" = nginx ] && files+=(-f docker-compose.nginx.yml)
log "proxy mode: $mode"

log "building and starting containers..."
docker compose "${files[@]}" up -d --build --remove-orphans

log "waiting for the app to become healthy..."
status=starting
for _ in $(seq 1 60); do
  cid="$(docker compose "${files[@]}" ps -q app)"
  status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo missing)"
  [ "$status" = healthy ] && break
  sleep 3
done
if [ "$status" != healthy ]; then
  docker compose "${files[@]}" logs --tail 80 app || true
  die "app is '$status' after 3 minutes"
fi

docker image prune -f >/dev/null 2>&1 || true
log "deployed $(cat .deployed-sha 2>/dev/null || echo 'current code') ✔"
