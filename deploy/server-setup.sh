#!/usr/bin/env bash
# ONE-TIME server setup (needs your sudo password once). Run from your laptop:
#
#   ssh -t jyotipravat@69.62.85.167 'curl -fsSL -H "Accept: application/vnd.github.raw" https://api.github.com/repos/jyotipravatiitm/clarifyme/contents/deploy/server-setup.sh | sudo bash -s -- jyotipravat clarity.maidocs.in'
#
# Optional 3rd argument: the local port for the app behind nginx (default: APP_PORT
# from .env, else the first free port from 3417).
#
# Installs Docker + rsync, lets the deploy user run Docker without sudo, opens the
# firewall, and if nginx already runs here, adds a site + HTTPS certificate.
# Safe to run again. After this, deploys run as the normal user with no sudo at all.
set -euo pipefail

DEPLOY_USER="${1:-${SUDO_USER:-}}"
DOMAIN="${2:-clarity.maidocs.in}"
WANT_PORT="${3:-}"
[ "$(id -u)" -eq 0 ] || { echo "Run with sudo (see the comment at the top)." >&2; exit 1; }
[ -n "$DEPLOY_USER" ] && id "$DEPLOY_USER" >/dev/null 2>&1 || { echo "Usage: sudo bash server-setup.sh <user> [domain]" >&2; exit 1; }
HOME_DIR="$(getent passwd "$DEPLOY_USER" | cut -d: -f6)"
APP_DIR="$HOME_DIR/clarifyme"
log() { printf '\033[1;36m[setup]\033[0m %s\n' "$*"; }

log "packages: rsync, curl, openssl"
if command -v apt-get >/dev/null; then
  apt-get update -qq && apt-get install -y -qq rsync curl ca-certificates openssl >/dev/null
fi

if ! command -v docker >/dev/null; then
  log "installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true
usermod -aG docker "$DEPLOY_USER"
log "$DEPLOY_USER can now run Docker without sudo"

install -d -o "$DEPLOY_USER" -g "$(id -gn "$DEPLOY_USER")" -m 755 "$APP_DIR"

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  for p in 22/tcp 80/tcp 443/tcp 443/udp; do ufw allow "$p" >/dev/null; done
  log "firewall: opened 80 and 443"
fi

if pgrep -x nginx >/dev/null 2>&1; then
  log "nginx is running: ClarifyMe will sit behind it"
  echo nginx > "$APP_DIR/.deploy-mode"

  # Local port for the app. Keep the one already chosen; otherwise pick a free one.
  ENV_FILE="$APP_DIR/.env"
  touch "$ENV_FILE" && chown "$DEPLOY_USER" "$ENV_FILE" && chmod 600 "$ENV_FILE"
  PORT="$WANT_PORT"
  [ -n "$PORT" ] || PORT="$(grep -E '^APP_PORT=[0-9]+$' "$ENV_FILE" | tail -1 | cut -d= -f2 || true)"
  if [ -z "$PORT" ]; then
    for p in $(seq 3417 3499); do
      ss -ltnH "( sport = :$p )" | grep -q . || { PORT="$p"; break; }
    done
  fi
  [ -n "$PORT" ] || { echo "No free port between 3417 and 3499" >&2; exit 1; }
  { grep -v '^APP_PORT=' "$ENV_FILE" || true; echo "APP_PORT=$PORT"; } > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
  chown "$DEPLOY_USER" "$ENV_FILE" && chmod 600 "$ENV_FILE"
  log "app will listen on 127.0.0.1:$PORT"

  site=/etc/nginx/sites-available/clarifyme
  cat > "$site" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    client_max_body_size 1m;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_read_timeout 90s;
    }
}
NGINX
  if [ -d /etc/nginx/sites-enabled ]; then ln -sf "$site" /etc/nginx/sites-enabled/clarifyme; else cp "$site" /etc/nginx/conf.d/clarifyme.conf; fi
  nginx -t && systemctl reload nginx

  # HTTPS. Re-running is safe: an existing certificate is re-installed into the site, not re-issued.
  command -v certbot >/dev/null || apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
  for attempt in 1 2 3; do
    if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect --keep-until-expiring --register-unsafely-without-email; then
      log "HTTPS ready for $DOMAIN"; break
    fi
    if [ "$attempt" -lt 3 ]; then log "certbot busy or failed, retrying in 30s ($attempt/3)"; sleep 30
    else log "certbot failed (is DNS for $DOMAIN pointing here?). Re-run this script later."; fi
  done
else
  echo caddy > "$APP_DIR/.deploy-mode"
  log "ports 80/443 are free: the bundled Caddy will get the HTTPS certificate on first deploy"
fi
chown "$DEPLOY_USER" "$APP_DIR/.deploy-mode"

log "done. Now run the GitHub workflow (Actions → CI & Deploy → Run workflow)."
