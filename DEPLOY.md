# Deploying to clarity.maidocs.in (automatic)

**Every push to the default branch deploys automatically.** GitHub Actions does all of this:

1. Tests the code: lint, typecheck, unit tests with Postgres, production build, and a real-browser test.
2. Logs into the VPS over SSH and installs Docker the first time.
3. Writes the server's `.env` from your GitHub secrets, keeping the database password it generated on the server.
4. Sets up HTTPS: the bundled Caddy, or your existing nginx + certbot if nginx is already running.
5. Rebuilds the app, waits until it is healthy, and checks `https://clarity.maidocs.in/api/health`.

Server: `69.62.85.167`. DNS: A record `clarity.maidocs.in → 69.62.85.167` (done).

## One-time setup (about 5 minutes)

Everything runs as your normal user **`jyotipravat`**, never root.

### 1. Deploy key (on your laptop)

```bash
ssh-keygen -t ed25519 -C "github-actions-clarifyme" -f ~/.ssh/clarifyme_deploy -N ""
ssh-copy-id -i ~/.ssh/clarifyme_deploy.pub jyotipravat@69.62.85.167
ssh -i ~/.ssh/clarifyme_deploy -o IdentitiesOnly=yes jyotipravat@69.62.85.167 "echo key works"
```

The last command must print `key works` without asking for a password.

### 2. Server setup (one time; asks for your sudo password)

```bash
ssh -t jyotipravat@69.62.85.167 'curl -fsSL -H "Accept: application/vnd.github.raw" https://api.github.com/repos/jyotipravatiitm/clarifyme/contents/deploy/server-setup.sh | sudo bash -s -- jyotipravat clarity.maidocs.in'
```

This does the following (see `deploy/server-setup.sh`):
- installs Docker and rsync;
- lets `jyotipravat` run Docker without sudo;
- opens ports 80/443;
- if nginx already runs on the server, adds a ClarifyMe site and gets the HTTPS certificate.

After this, deploys never need sudo.

### 3. GitHub secrets

Open https://github.com/jyotipravatiitm/clarifyme/settings/secrets/actions and add each one with **New repository secret**:

| Secret name | Value | Needed? |
|---|---|---|
| `VPS_SSH_KEY` | the whole content of `~/.ssh/clarifyme_deploy` (the private file, including the `-----BEGIN`/`END` lines). Mac: `pbcopy < ~/.ssh/clarifyme_deploy` | **yes** |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_…` from dashboard.clerk.com → API keys (the name `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` also works) | for accounts; needs both Clerk keys |
| `CLERK_SECRET_KEY` | `sk_test_…` | for accounts |
| `GA_MEASUREMENT_ID` | `G-…` from Google Analytics | optional: defaults to `G-GQ27VPM6QY` |
| `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`, `OPENROUTER_API_KEY` | AI providers | optional |

Optional **variables** (Variables tab). The defaults are already right for you:

| Variable | Default |
|---|---|
| `VPS_HOST` | `69.62.85.167` |
| `VPS_USER` | `jyotipravat` |
| `APP_DOMAIN` | `clarity.maidocs.in` |
| `FREE_LESSONS` | `10` |
| `GA_CONSENT` | `opt-out` |

### 4. Deploy

Open https://github.com/jyotipravatiitm/clarifyme/actions/workflows/ci-deploy.yml and click **Run workflow**. The first run takes about 10 minutes.

After that, **every push deploys automatically**.

## Sign-in (Clerk)

ClarifyMe's own buttons (*Get started*, *I already have an account*, *Create a profile*) open Clerk's sign-in as a pop-up over the page. It is already styled with ClarifyMe's colours, font and Lumi's logo, so you only configure Clerk itself:

1. Open https://dashboard.clerk.com → your application:
   - **Configure → User & authentication**: turn on **Email** (code or password) and **Google**.
   - **Configure → Customization → Branding**: name "ClarifyMe". Logo: upload `public/brand/lumi.png` from this repo. It's used in emails and on Clerk-hosted pages.
2. While testing, the **Development** keys (`pk_test_…` / `sk_test_…`) work as they are, with a small "Development mode" badge. Put them in the GitHub secrets `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. **For launch:**
   1. Create a **Production** instance and give it the domain `clarity.maidocs.in`.
   2. Clerk lists about 5 **CNAME** records (`clerk.`, `accounts.`, `clkmail.`, `clk._domainkey.`, `clk2._domainkey.`). Add them where you manage DNS for maidocs.in, then click *Verify*.
   3. For Google sign-in in production, create an OAuth client in Google Cloud Console. Use the redirect URI Clerk shows, then paste the client ID and secret into Clerk.
   4. Replace the two GitHub secrets with the `pk_live_…` / `sk_live_…` keys and run the workflow.

## Changing the domain

1. Point the new name's DNS A record at the server.
2. Re-run the server setup with the new domain. It rewrites the nginx site and gets the certificate:
   ```bash
   ssh -t jyotipravat@69.62.85.167 'sudo bash ~/clarifyme/deploy/server-setup.sh jyotipravat NEW.DOMAIN'
   ```
3. Set the GitHub variable `APP_DOMAIN` to the new domain, then run the workflow.
4. Update the Google Analytics stream URL and the Clerk domain.

## Changing settings

- **Change a value**: edit the secret in GitHub, then re-run the workflow (or push). The server's `.env` is updated, and settings you don't set in GitHub keep their server value.
- **Remove a setting completely**: edit `~/clarifyme/.env` on the server and redeploy.
- **Clerk for real launch**:
  1. In Clerk, create a **Production** instance for `clarity.maidocs.in`.
  2. Add the CNAME records Clerk lists at your DNS provider.
  3. Put the `pk_live_…`/`sk_live_…` keys into the two Clerk secrets and re-run.

## Watching and fixing

| Task | How |
|---|---|
| See what happened | GitHub → **Actions** → the run → open a red step. Screenshots from the browser test are under **Artifacts**. |
| Server logs | `ssh jyotipravat@69.62.85.167 'cd ~/clarifyme && docker compose logs --tail 100 app'` |
| Backups | daily in `~/clarifyme/backups/` on the server |
| Restore a backup | `gunzip -c backups/daily/<file>.sql.gz \| docker compose exec -T db psql -U clarifyme clarifyme` |

Troubleshooting:

| Problem | Fix |
|---|---|
| "Deploy skipped" warning | The `VPS_SSH_KEY` secret is missing. |
| `Permission denied (publickey)` | The deploy key isn't on the server for `jyotipravat`. Redo step 1. |
| "One-time server setup needed" | Run step 2. |
| Health check fails, certificate errors | DNS must point to the server, and ports 80/443 must be open in Hostinger's firewall (hPanel → VPS → Security → Firewall). |
| Already running nginx | Step 2 adds ClarifyMe as an nginx site and gets the certificate. |

## Manual deploy (without GitHub Actions)

On the server:

```bash
git clone https://github.com/jyotipravatiitm/clarifyme ~/clarifyme
cd ~/clarifyme
printf 'DOMAIN=clarity.maidocs.in\nCLERK_SECRET_KEY=...\n' > .env.github   # any settings you want
bash deploy/provision.sh && bash deploy/deploy.sh    # after the one-time step 2
```
