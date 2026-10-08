# Deploying CurioCity

Step-by-step guide to get CurioCity live. The stack is platform-agnostic — the commands below work anywhere Node + Postgres run. Recommended example stack: **Railway** (API), **Vercel** (web), **Neon** (Postgres), but Render/Fly/Netlify/Supabase all work too.

## Prerequisites

- A GitHub repo with this codebase
- Accounts: hosting platform(s), a Postgres provider, plus the API keys from `services/api/.env.example` (Stripe, storage, Anthropic, email)
- A domain (optional for MVP — you can use provider subdomains first)

## 1. Database

1. Create a Postgres database (Neon, Supabase, Railway, …).
2. Copy the connection string — it looks like:
   `postgresql://user:password@host:5432/dbname?sslmode=require`
3. Run migrations against it (idempotent, safe to re-run):
   ```bash
   DATABASE_URL="your-production-url" npm run db:migrate
   ```
4. Optionally seed demo content:
   ```bash
   DATABASE_URL="your-production-url" npm run db:seed
   ```

## 2. Backend (Express API)

**Build:**
```bash
npm ci
npm run build:api        # compiles to services/api/dist
node services/api/dist/index.js   # smoke-test locally
```

There is also a `services/api/Dockerfile` if your platform deploys containers.

**Environment variables** — set every one from `services/api/.env.example` in your host's dashboard:

| Required | Notes |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3001` (or the port your platform assigns) |
| `DATABASE_URL` | from step 1 |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -hex 32` each — **must differ from defaults** or the API refuses to start in production |
| `CORS_ORIGIN` | your frontend URL(s), comma-separated |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID` | from Stripe dashboard |
| `ANTHROPIC_API_KEY` | from console.anthropic.com |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION` | Cloudflare R2 or AWS S3 |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` | from SendGrid |

Optional: `SENTRY_DSN` (error tracking), `VAPID_*` (push), analytics tokens.

**Verify after deploy:**
```bash
curl https://your-api-domain/health          # {"status":"ok","db":"connected"}
curl https://your-api-domain/api/guides      # guide list
```

## 3. Frontend (Vite/React)

**Build:**
```bash
npm ci
npm run build:web        # outputs apps/web/dist
```

**Environment variables** (host dashboard):

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | full API origin + `/api`, e.g. `https://api.yourdomain.com/api`. Leave empty only if you proxy `/api` at the edge. |
| `VITE_SENTRY_DSN` | optional |

**Vercel specifics:** root directory `apps/web` isn't required if you build from repo root — set build command `npm run build:web` and output directory `apps/web/dist`.

**After deploy:** update the backend `CORS_ORIGIN` to include the final frontend URL.

## 4. DNS

- Frontend: `curiocity.app` → CNAME to your web host
- Backend: `api.curiocity.app` → CNAME to your API host
- Both platforms provide free TLS certificates automatically.

## 5. Stripe production wiring

1. Stripe Dashboard → Developers → Webhooks → add endpoint:
   `https://api.yourdomain.com/api/webhooks/stripe`
   Events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `account.updated`
2. Copy the **live** signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Swap test keys (`sk_test_…`) for live keys (`sk_live_…`).
4. Test a real small purchase end-to-end.

## 6. CI/CD

- `.github/workflows/ci.yml` — runs build + tests on every push/PR (already active).
- `.github/workflows/deploy-api.yml` — builds and deploys the API on push to `main` under `services/api/**`. **Fill in your platform's deploy step** (commented examples for Railway and Render are in the file).
- Frontend: connect the repo to Vercel/Netlify for auto-deploy from git — no workflow needed.

## 7. After going live

- Point uptime monitoring (e.g. UptimeRobot free tier) at `https://api.yourdomain.com/health`
- Check `SENTRY_DSN` receives events (trigger a test error)
- Register a real account and walk through: register → verify email → browse → purchase → creator onboarding

## Rollback

Every deploy is a git push. Revert with `git revert <sha>` and push — CI/CD redeploys the previous state. Database migrations are forward-only; keep backups enabled on your Postgres provider.
