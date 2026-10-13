# Temporary Modifications

Scratchpad for local/dev-only changes and the machine state needed to reproduce them. Delete anything here that becomes permanent, or move it into the proper docs.

## Cloudflare quick tunnel (mobile testing)

**Purpose:** test the app on a real phone and share an installable link with a few people, without deploying anywhere.

**Current URL (regenerated every restart):**

```
https://entitled-owen-commodity-vanilla.trycloudflare.com
```

Verified working: `GET /` 200, `/manifest.json` 200 (standalone, 3 icons), `/sw.js` 200, `/api/guides?city=Barcelona` returns 8.

### Why the app is served from `vite preview`, not `vite dev`

- `vite.config.ts` sets `devOptions.enabled: false` for the PWA plugin, so the **dev server registers no service worker**. Chrome requires a SW for installability, so `vite dev` yields a plain page with no "Install app" banner.
- `vite preview` serves `apps/web/dist`, which contains the generated `sw.js` + `manifest.json`. Only this path is installable on a phone.

### Why `preview` needed its own config

`server.proxy` does **not** carry over to `preview`. Without a `preview.proxy` block the tunneled app 404s on every `/api/*` call.

### Changes made to `apps/web/vite.config.ts`

1. `server.allowedHosts: ['.trycloudflare.com']`
   - Vite 8's `isHostAllowed()` only auto-allows hosts when `server.host` is a **string**. The repo sets `host: true` (boolean), so `allowedHosts` stayed empty and every tunnel request would have been rejected with **403 Blocked request**.
2. New `preview` block:
   - `port: 4173`, `strictPort: true`, `host: true`
   - `allowedHosts: ['.trycloudflare.com']`
   - `proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }`

These are harmless to keep in the repo; `.trycloudflare.com` is a public Cloudflare domain, not a secret. Remove the `allowedHosts` entries if you'd rather not allow that host.

### Machine state required

| Process | How it was started | Port |
|---|---|---|
| PostgreSQL | `docker start wanderwise-postgres` | 5432 |
| API | `npm run dev:api` (root) | 3001 |
| Web (preview) | `npm run preview --workspace=apps/web` | 4173 |
| cloudflared | `cloudflared tunnel --url http://localhost:4173` | — |

`cloudflared` was installed with `winget install --id Cloudflare.cloudflared`. Binary path: `C:\Program Files (x86)\cloudflared\cloudflared.exe`.

### Restarting everything

```powershell
# 1. DB (Docker Desktop must already be running)
& "C:\Program Files\Docker\Docker\resources\bin\docker.exe" start wanderwise-postgres

# 2. API
npm run dev:api

# 3. Rebuild only if you changed web source, then serve it
npm run build:web
npm run preview --workspace=apps/web

# 4. Tunnel — URL is printed to stderr, look for trycloudflare.com
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:4173
```

### Installing on a phone

- **Android (Chrome):** open the URL → menu (⋮) → **Install app**.
- **iOS (Safari):** open the URL → Share sheet → **Add to Home Screen**.

### Known limitations — read before sending the link to anyone

- **Your PC must stay on** with all four processes running. Kill any of them and the link dies for everyone.
- **The URL is random** and changes on every `cloudflared` restart (including a reboot). Re-send the link if that happens.
- **iOS standalone logins can be flaky:** Safari's "Add to Home Screen" runs in a separate storage container, so testers may have to sign in once inside the installed app even if they were logged in on the website.
- No push notifications or icon badges on iOS — a PWA limitation.
- Geolocation works (HTTPS satisfies the browser requirement) but prompts once per origin.

### For a permanent shared URL

A free Cloudflare account plus a domain (~$10/yr) gives a **named tunnel** with a fixed hostname that survives restarts. That, or the real Vercel + Railway deploy described in `DEPLOY.md`.

## Other temporary state from this session

- **Barcelona seed guides** (8 total, incl. 2 seasonal: one with a limited validity window, one recurring Sunday morning) live only in the **local dev database**. They are not committed seed data, so a fresh production DB will not have them. See `services/api/src/app.test.ts` for the test fixtures that recreate similar data.
- **Docker Desktop** needed a manual restart after an interrupted update (`Docker.backup` directory was present, `docker` had dropped off PATH). If `docker` is "not recognized", use the full path above.
