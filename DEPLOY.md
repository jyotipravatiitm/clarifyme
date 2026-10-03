# Deploying to clarifyme.maidocs.in

Server: `69.62.85.167` (user `jyotipravat`). DNS: A record `clarifyme.maidocs.in → 69.62.85.167`.

> **Where does `.env` go?** Only on the VPS, in the project folder next to `docker-compose.yml`:
> `~/clarifyme/.env`. Git ignores it, so it is never committed. Never paste its contents into chats or issues.

## 0. Check the server

```bash
ssh jyotipravat@69.62.85.167
dig +short clarifyme.maidocs.in          # must print 69.62.85.167 (DNS can take a few minutes)
sudo ss -ltnp | grep -E ':80 |:443 '     # what already uses the web ports?
```

- **Nothing listed** → use **Path A** (the bundled Caddy gets HTTPS automatically).
- **nginx listed** (e.g. it already serves maidocs.in) → use **Path B** (put ClarifyMe behind your nginx).
- **apache or anything else listed** → use Path B, but you'll need an equivalent site config for that server; ask for help.

## 1. Install Docker (once)

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker                                   # or log out and back in
docker compose version                          # should print v2.x
# If the ufw firewall is on:
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
```

## 2. Get the code

The repository is `jyotipravatiitm/clarifyme`. If it is private, give the server a read-only **deploy key**:

```bash
ssh-keygen -t ed25519 -C clarifyme-vps -f ~/.ssh/clarifyme -N ""
cat ~/.ssh/clarifyme.pub
```

1. Open GitHub → the repo → **Settings → Deploy keys → Add deploy key**.
2. Paste the key and leave "Allow write access" **off**.
3. Run:

```bash
cat >> ~/.ssh/config <<'CFG'
Host github-clarifyme
  HostName github.com
  IdentityFile ~/.ssh/clarifyme
CFG
git clone -b claude/gracious-knuth-ddtijc git@github-clarifyme:jyotipravatiitm/clarifyme.git ~/clarifyme
cd ~/clarifyme
```

Once the work is merged into `main`, use `-b main` (or switch later with `git checkout main && git pull`).

## 3. Create `~/clarifyme/.env`

```bash
cd ~/clarifyme
cp .env.example .env
chmod 600 .env
openssl rand -hex 24        # copy this for POSTGRES_PASSWORD
nano .env
```

| Setting | What to put | Where to get it |
|---|---|---|
| `DOMAIN` | `clarifyme.maidocs.in` | |
| `POSTGRES_PASSWORD` | the random string from `openssl` | Keep it safe; it is your database password |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_…` (later `pk_live_…`) | dashboard.clerk.com → your app → **API keys** |
| `CLERK_SECRET_KEY` | `sk_test_…` (later `sk_live_…`) | same page |
| `FREE_LESSONS` | `10` | lessons a guest gets before signing up |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` | analytics.google.com → Admin → **Data streams** → Web stream for `https://clarifyme.maidocs.in` → Measurement ID |
| `NEXT_PUBLIC_GA_CONSENT` | `opt-out` | use `opt-in` if you expect EU/UK visitors |
| `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` | optional AI judge | your OpenAI-compatible provider |
| `OPENROUTER_API_KEY` | optional Jev judge | openrouter.ai → Keys |

**Clerk development vs production keys**
- **Development keys** (`pk_test_`/`sk_test_`) work right away on any domain. Sign-in shows a small "Development mode" badge, and there are user limits. They are fine for a soft launch.
- **For the real launch**:
  1. In Clerk, switch to **Production** and create the production instance for `clarifyme.maidocs.in`.
  2. Clerk lists a few **CNAME** records (like `clerk.clarifyme.maidocs.in`). Add them where you added the A record, then wait until Clerk shows them as verified.
  3. If you use Google sign-in in production, set up your own Google OAuth credentials as Clerk instructs.
  4. Put the `pk_live_…`/`sk_live_…` keys in `.env` and rebuild (step 4 again).

## 4. Start it

### Path A: nothing else on ports 80/443 (Caddy handles HTTPS)

```bash
docker compose up -d --build
```

### Path B: nginx already serves other sites

```bash
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up -d --build
sudo cp deploy/nginx-clarifyme.conf /etc/nginx/sites-available/clarifyme
sudo ln -s ../sites-available/clarifyme /etc/nginx/sites-enabled/clarifyme
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx   # if certbot is missing
sudo certbot --nginx -d clarifyme.maidocs.in        # HTTPS + auto-renewal
```

The first build takes a few minutes.

## 5. Check it works

```bash
docker compose ps                                   # db "healthy", app "healthy", backup up (+ caddy on Path A)
docker compose logs app | grep -E "migrations applied|Ready"
curl https://clarifyme.maidocs.in/api/health        # {"ok":true,"db":"up"}
```

Then open https://clarifyme.maidocs.in:
1. The cookie banner appears.
2. Finish a lesson.
3. Sign up.
4. **Review** shows the lesson you just played as a guest.

## Everyday tasks

| Task | Command (from `~/clarifyme`) |
|---|---|
| Update to the latest code | `git pull && docker compose up -d --build` (Path B: add the two `-f` flags) |
| See logs | `docker compose logs -f app` |
| Restart | `docker compose restart app` |
| Changed `.env` | `docker compose up -d --build` (`NEXT_PUBLIC_*` values are baked into the page, so rebuild) |
| Database shell | `docker compose exec db psql -U clarifyme clarifyme` |
| Backups | daily in `~/clarifyme/backups/`. Copy them off the server now and then (e.g. `scp -r jyotipravat@69.62.85.167:clarifyme/backups .`) |
| Restore a backup | `gunzip -c backups/daily/<file>.sql.gz \| docker compose exec -T db psql -U clarifyme clarifyme` |

## Troubleshooting

| Problem | Fix |
|---|---|
| **Caddy can't get a certificate** | Check that DNS points at the server (`dig`) and that ports 80/443 are open in ufw and in your VPS provider's firewall panel. |
| **`port is already allocated`** | Something else uses 80/443 → use Path B. |
| **Sign-in page 404** | The Clerk keys are missing from `.env`. Add them and rebuild. |
| **`{"db":"down"}`** | Run `docker compose logs db`. If you changed `POSTGRES_PASSWORD` after the first start, the old password still applies, because it is stored in the database volume. |
