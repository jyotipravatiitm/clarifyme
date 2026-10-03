#!/usr/bin/env bash
# Runs ON THE SERVER at every deploy, as the normal deploy user (no sudo needed).
#   - checks the one-time setup (deploy/server-setup.sh) was done
#   - merges settings sent by GitHub Actions (.env.github) into .env, keeping the DB password
set -euo pipefail
cd "$(dirname "$0")/.."
log() { printf '\033[1;36m[provision]\033[0m %s\n' "$*"; }

# Root (or passwordless sudo) can do the one-time setup automatically.
if ! docker info >/dev/null 2>&1; then
  if [ "$(id -u)" -eq 0 ]; then bash deploy/server-setup.sh root
  elif sudo -n true 2>/dev/null; then sudo -n bash deploy/server-setup.sh "$(id -un)"
  fi
fi
if ! docker info >/dev/null 2>&1; then
  cat >&2 <<MSG
[provision] This user can't run Docker yet. Do the one-time setup from your laptop (asks for your sudo password):

  ssh -t $(id -un)@<server> 'curl -fsSL -H "Accept: application/vnd.github.raw" https://api.github.com/repos/jyotipravatiitm/clarifyme/contents/deploy/server-setup.sh | sudo bash -s -- $(id -un) <domain>'

Then run the GitHub workflow again.
MSG
  exit 1
fi

# .env: values from GitHub override; everything else (e.g. POSTGRES_PASSWORD) is kept.
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

if [ ! -s .deploy-mode ]; then
  if pgrep -x nginx >/dev/null 2>&1; then echo nginx > .deploy-mode; else echo caddy > .deploy-mode; fi
fi
if [ "$(cat .deploy-mode)" = nginx ] && [ ! -e /etc/nginx/sites-enabled/clarifyme ] && [ ! -e /etc/nginx/conf.d/clarifyme.conf ]; then
  echo "[provision] nginx runs here but has no ClarifyMe site yet. Run the one-time setup (deploy/server-setup.sh)." >&2
  exit 1
fi
log "server ready ($(cat .deploy-mode) mode)"
