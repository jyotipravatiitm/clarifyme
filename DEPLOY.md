# Deploying to clarifyme.maidocs.in (automatic)

**Every push to the default branch deploys automatically.** GitHub Actions does all of this:

1. Tests the code: lint, typecheck, unit tests with Postgres, production build, and a real-browser test.
2. Logs into the VPS over SSH and installs Docker the first time.
3. Writes the server's `.env` from your GitHub secrets, keeping the database password it generated on the server.
4. Sets up HTTPS: the bundled Caddy, or your existing nginx + certbot if nginx is already running.
5. Rebuilds the app, waits until it is healthy, and checks `https://clarifyme.maidocs.in/api/health`.

Server: `69.62.85.167`. DNS: A record `clarifyme.maidocs.in → 69.62.85.167` (done).

## One-time setup (about 5 minutes, all in the browser plus one command on your computer)

### 1. Make a deploy key on **your own computer**

Mac/Linux Terminal, or Windows PowerShell:

```bash
ssh-keygen -t ed25519 -C "github-actions-clarifyme" -f clarifyme_deploy -N ""
```

This creates two files:
- `clarifyme_deploy.pub`: the **public** key. It goes on the VPS.
- `clarifyme_deploy`: the **private** key. It goes into GitHub only. Don't share it anywhere else, and don't paste it in chats.

### 2. Add the public key to the VPS (Hostinger)

hPanel → VPS → **SSH keys** → **+ SSH key** → paste the whole content of `clarifyme_deploy.pub` → **Save**.

Hostinger installs panel keys for the `root` user, so the workflow connects as `root`.

> If Hostinger asks to apply the key or reinstall the OS, **don't reinstall**. If the key doesn't seem to apply, use **Web console** (top right) and run:
> `mkdir -p ~/.ssh && echo "PASTE-THE-.pub-LINE-HERE" >> ~/.ssh/authorized_keys`

### 3. Add secrets in GitHub

Open https://github.com/jyotipravatiitm/clarifyme/settings/secrets/actions and click **New repository secret** for each:

| Secret name | Value | Needed? |
|---|---|---|
| `VPS_SSH_KEY` | the whole content of `clarifyme_deploy` (the private key, including the `-----BEGIN`/`END` lines) | **yes** |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_…` from dashboard.clerk.com → API keys | for accounts |
| `CLERK_SECRET_KEY` | `sk_test_…` from the same page | for accounts |
| `GA_MEASUREMENT_ID` | `G-…` from GA4 → Admin → Data streams → Web stream for `https://clarifyme.maidocs.in` | for analytics |
| `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` | any OpenAI-compatible provider | optional AI judge |
| `OPENROUTER_API_KEY` | openrouter.ai → Keys | optional Jev judge |

Optional **variables** (same page → *Variables* tab). The defaults are already right for you:

| Variable | Default | When to change |
|---|---|---|
| `VPS_HOST` | `69.62.85.167` | |
| `VPS_USER` | `root` | to deploy as another user (needs passwordless sudo) |
| `APP_DOMAIN` | `clarifyme.maidocs.in` | |
| `FREE_LESSONS` | `10` | |
| `GA_CONSENT` | `opt-out` | `opt-in` for EU/UK visitors |
| `CERT_EMAIL` | none | for Let's Encrypt expiry emails (nginx mode) |

### 4. Deploy

Open https://github.com/jyotipravatiitm/clarifyme/actions/workflows/ci-deploy.yml, click **Run workflow** and pick the default branch.

The first run takes about 10 minutes (it installs Docker and builds everything). Later runs take 3–5 minutes. When it's green, open https://clarifyme.maidocs.in.

From now on, **just push**. Each push to the default branch is tested and, if green, deployed.

## Changing settings

- **Change a value**: edit the secret in GitHub, then re-run the workflow (or push). The server's `.env` is updated, and settings you don't set in GitHub keep their server value.
- **Remove a setting completely**: edit `/root/clarifyme/.env` on the server (Hostinger Web console) and redeploy.
- **Clerk for real launch**:
  1. In Clerk, create a **Production** instance for `clarifyme.maidocs.in`.
  2. Add the CNAME records Clerk lists at your DNS provider.
  3. Put the `pk_live_…`/`sk_live_…` keys into the two Clerk secrets and re-run.

## Watching and fixing

| Task | How |
|---|---|
| See what happened | GitHub → **Actions** → the run → open a red step. Screenshots from the browser test are under **Artifacts**. |
| Server logs | Hostinger Web console: `cd ~/clarifyme && docker compose logs -f app` |
| Backups | daily in `/root/clarifyme/backups/` |
| Restore a backup | `gunzip -c backups/daily/<file>.sql.gz \| docker compose exec -T db psql -U clarifyme clarifyme` |

Troubleshooting:

| Problem | Fix |
|---|---|
| "Deploy skipped" warning | The `VPS_SSH_KEY` secret is missing. |
| `Permission denied (publickey)` | The public key isn't on the server for the user in `VPS_USER`. Check step 2. |
| Health check fails, certificate errors | DNS must point to the server, and ports 80/443 must be open in Hostinger's firewall (hPanel → VPS → Security → Firewall). |
| Already running nginx | Handled automatically: ClarifyMe is added as an nginx site, and certbot gets the certificate. |

## Manual deploy (without GitHub Actions)

On the server:

```bash
git clone https://github.com/jyotipravatiitm/clarifyme ~/clarifyme
cd ~/clarifyme
printf 'DOMAIN=clarifyme.maidocs.in\nCLERK_SECRET_KEY=...\n' > .env.github   # any settings you want
bash deploy/provision.sh && bash deploy/deploy.sh
```
