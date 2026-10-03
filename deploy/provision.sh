#!/usr/bin/env bash
# Prepares the VPS. Runs ON THE SERVER on every deploy (GitHub Actions calls it); safe to repeat.
#   - installs Docker if missing
#   - merges settings sent by GitHub Actions (.env.github) into .env, keeping the DB password
#   - opens the firewall, and if the server already runs nginx, adds a site + HTTPS certificate
# Needs root, or a user with passwordless sudo.
set -euo pipefail
cd "$(dirname "$0")/.."

log()  { printf '\033[1;36m[provision]\033[0m %s\n' "$*"; }
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo -n"

# ---- Docker
if ! command -v docker >/dev/null; then
  log "installing Docker..."
  curl -fsSL https://get.docker.com | $SUDO sh
fi
$SUDO systemctl enable --now docker >/dev/null 2>&1 || true
if [ "$(id -u)" -ne 0 ] && ! id -nG | grep -qw docker; then
  $SUDO usermod -aG docker "$(id -un)"
  log "added $(id -un) to the docker group (takes effect on the next login)"
fi

# ---- .env: values from GitHub override, everything else (e.g. POSTGRES_PASSWORD) is kept
touch .env && chmod 600 .env
if [ -f .env.github ]; then
  keys="$(grep -oE '^[A-Z0-9_]+=' .env.github | tr -d '=' | paste -sd'|' -)"
  if [ -n "$keys" ]; then
    { grep -vE "^(${keys})=" .env || true; cat .env.github; } > .env.tmp
    mv .env.tmp .env && chmod 600 .env
  fi
  rm -f .env.github
  log "settings updated from GitHub"
fi
if ! grep -qE '^POSTGRES_PASSWORD=.+' .env; then
  echo "POSTGRES_PASSWORD=$(openssl rand -hex 24)" >> .env
  log "generated a database password (kept in .env, never leaves the server)"
fi
grep -qE '^DOMAIN=.+' .env || { echo "DOMAIN is not set" >&2; exit 1; }
DOMAIN="$(grep -E '^DOMAIN=' .env | tail -1 | cut -d= -f2-)"

# ---- Firewall
if command -v ufw >/dev/null && $SUDO ufw status 2>/dev/null | grep -q "Status: active"; then
  for p in 22/tcp 80/tcp 443/tcp 443/udp; do $SUDO ufw allow "$p" >/dev/null; done
fi

# ---- Reverse proxy: our Caddy, or the server's existing nginx
if [ ! -s .deploy-mode ]; then
  if pgrep -x nginx >/dev/null 2>&1; then echo nginx > .deploy-mode; else echo caddy > .deploy-mode; fi
fi
if [ "$(cat .deploy-mode)" = nginx ]; then
  site=/etc/nginx/sites-available/clarifyme
  if [ ! -f "$site" ]; then
    log "nginx detected: adding a site for $DOMAIN -> 127.0.0.1:3000"
    sed "s/clarifyme.maidocs.in/$DOMAIN/g" deploy/nginx-clarifyme.conf | $SUDO tee "$site" >/dev/null
    if [ -d /etc/nginx/sites-enabled ]; then $SUDO ln -sf "$site" /etc/nginx/sites-enabled/clarifyme
    else $SUDO cp "$site" /etc/nginx/conf.d/clarifyme.conf; fi
    $SUDO nginx -t && $SUDO systemctl reload nginx
  fi
  if ! $SUDO test -d "/etc/letsencrypt/live/$DOMAIN"; then
    command -v certbot >/dev/null || { $SUDO apt-get update -qq && $SUDO apt-get install -y -qq certbot python3-certbot-nginx >/dev/null; }
    email="$(grep -E '^CERT_EMAIL=' .env | cut -d= -f2- || true)"
    if [ -n "$email" ]; then reg=(-m "$email"); else reg=(--register-unsafely-without-email); fi
    log "requesting an HTTPS certificate for $DOMAIN..."
    $SUDO certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect "${reg[@]}" || log "certbot failed; check DNS for $DOMAIN, the next deploy retries"
  fi
fi
log "server ready ($(cat .deploy-mode) mode)"
