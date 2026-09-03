# CurioCity — Full Project Review & Launch TODO Lists

Last updated: 2026-09-02

## Project Summary

CurioCity is a travel guide platform where local creators publish curated walking guides with AI-generated descriptions, audio narration, and interactive OpenStreetMap maps. The stack is React 19 + Vite (frontend) and Express + Drizzle ORM + PostgreSQL (backend), with Stripe payments, Anthropic AI, and S3 storage.

---

## Bugs Found

### Critical

| # | Area | File | Issue |
|---|------|------|-------|
| B1 | Frontend — XSS | LeafletMap.tsx L82-85 | Stop names are interpolated directly into HTML popup strings without escaping. User-supplied or GPS-imported stop names can inject scripts. Must sanitize with DOMPurify or text-only binding. |
| B2 | Frontend — Offline broken | GuidePage.tsx L167-180 | When the API call fails (e.g. no network), the code immediately shows an error instead of falling back to IndexedDB. The offline download feature is therefore useless when actually offline. |
| B3 | Backend — Webhook body parsing | app.ts L42 vs L32 | express.raw() for /api/webhooks is registered after express.json(). The JSON parser consumes the raw body first, so Stripe signature verification will always fail because req.body is a parsed object instead of a raw Buffer. The express.raw() middleware must be registered before express.json(). |
| B4 | Backend — Earnings query | users.ts L30 | The earningsResult query uses eq(payments.guideId, guides.id) as a WHERE condition instead of a JOIN, which produces incorrect results (cross-join with filter). Should be a proper INNER JOIN. |
| B5 | Backend — Import after use | errorHandler.ts L98 | import { config } appears at the bottom of the file, after the function that uses it. Works due to hoisting in ESM, but will fail in CommonJS and is a code smell/reliability risk. |
| B6 | Backend — Payout SQL | payments.ts L111, L116 | Payout endpoint marks payments as paidOut = true matching payments.userId but the SUM query matches guides.creatorId. These reference different columns — a creator's payments may not have userId = creator's ID. The update could mark the wrong rows. |
| B7 | Backend — Translate missing stops | ai.ts L140 | guide.stops is always undefined because the guides table doesn't have a stops column — stops are in the guide_stops table. The translate prompt sends [] as stops data. Must fetch stops separately. |

### High

| # | Area | File | Issue |
|---|------|------|-------|
| B8 | Frontend — NaN costs | CreatePage.tsx L134-137 | parseFloat() on cost inputs doesn't check for NaN. Non-numeric input silently sends NaN to the API. |
| B9 | Frontend — Search spam | HomePage.tsx L54-60 | fetchSuggestions() fires on every keystroke (no debounce). The existing debouncedSearch state is ignored for suggestions. Causes excessive API calls. |
| B10 | Frontend — Missing User-Agent | CreatePage.tsx L65 | Direct Nominatim call from frontend lacks required User-Agent header — violates their ToS and risks IP ban. |
| B11 | Backend — strict: false | tsconfig.json L9 | TypeScript strict mode is disabled, along with all individual strict checks. This masks type errors at compile time. |
| B12 | Backend — .env committed | .env | The .env file with database credentials is committed to the repository. Should be in .gitignore. |
| B13 | Backend — Guide list filter chaining | guides.ts L43-54 | Multiple .where() calls on the Drizzle query builder replace (not AND) previous conditions. Only the last filter applied actually takes effect. Should combine with and(). |
| B14 | Backend — Report count self-reference | reports.ts L62 | The admin reports query has a subquery SELECT count(*) FROM reports WHERE reports.targetType = reports.targetType which always equals the total report count — it's comparing the column to itself. |

### Medium

| # | Area | File | Issue |
|---|------|------|-------|
| B15 | Backend — Password reset not emailed | auth.ts L69 | Password reset only console.log()s the reset URL. The sendPasswordResetEmail() utility exists but is never called. |
| B16 | Backend — Email verification not sent | auth.ts L37-41 | Registration auto-verifies email in dev (emailVerified: true) but never sends verification email in production. The sendVerificationEmail() utility exists but is unused. |
| B17 | Backend — Email verification token insecure | email.ts L24 | Verification token is just a base64-encoded JSON object — no HMAC/signature. Anyone can forge a token by base64-encoding {userId, type: 'verify'}. |
| B18 | Backend — Docker DB name mismatch | docker-compose.yml L9-10 | Database name is wanderwise (old project name) while the project is called CurioCity. Not a breaking bug but confusing. |
| B19 | Backend — Analytics purchases query | analytics.ts L57 | Purchase count uses eq(payments.guideId, guideIdList[0]) — only checks the first guide, not all guides. |

---

## Architecture & Code Quality Issues

| # | Issue | Details |
|---|-------|---------|
| A1 | Empty shared packages | packages/config, packages/types, packages/ui are all empty directories. No shared types, UI components, or config used between frontend and backend. |
| A2 | Empty infra directories | infra/docker, infra/k8s, infra/terraform are all empty. No deployment infrastructure exists. |
| A3 | Zero test files | Both services/api/tests/ and the frontend have no test files. No unit, integration, or e2e tests exist anywhere. |
| A4 | Empty top-level route/middleware/models dirs | services/api/routes/, services/api/middleware/, services/api/models/, services/api/utils/ are all empty — the actual code is under services/api/src/. Confusing directory structure. |
| A5 | Stale documentation | Multiple review files (PROJECT_REVIEW.md, PROJECT_REVIEW_v2.md, PROGRESS_MVP.md, WANDERWISE_*.md) have contradictory information. Old "WanderWise" naming persists. |
| A6 | No API docs | docs/api/, docs/adr/, docs/runbooks/ are all empty. /api/docs returns an empty OpenAPI spec (paths: {}). |
| A7 | No graceful shutdown | Server has no process.on('SIGTERM') handler to drain connections. Docker/K8s restarts could drop in-flight requests. |
| A8 | No request logging | morgan is imported but never used in app.ts. No HTTP request logging. |
| A9 | Duplicate code | Geocoding logic is duplicated between src/routes/geocode.ts and src/utils/geocode.ts. S3 client creation is duplicated between src/routes/upload.ts and src/utils/upload.ts. |

---

## TODO: MVP Launch (Web App)

> **IMPORTANT:** The goal is to get CurioCity live as a web app with core functionality working. Cut scope aggressively — the items below are the minimum.

### Phase 1: Fix Critical Bugs (Days 1-3)

- [ ] B3 — Fix webhook body parsing order in app.ts: Move express.raw() registration above express.json() for the webhooks route
- [ ] B1 — Fix XSS in map popups: Sanitize stop names in LeafletMap.tsx using DOMPurify or text-only Leaflet binding
- [ ] B2 — Fix offline fallback: Add IndexedDB fallback in GuidePage.tsx when API call fails
- [ ] B4 — Fix earnings query: Rewrite the earnings SELECT in users.ts with a proper INNER JOIN
- [ ] B6 — Fix payout logic: Align the payout SUM and UPDATE queries to use the same creatorId reference
- [ ] B7 — Fix translate endpoint: Fetch stops from guide_stops table before sending to AI
- [ ] B13 — Fix guide list filters: Combine all WHERE conditions using and() instead of chaining .where()
- [ ] B12 — Remove .env from repo: Add services/api/.env to .gitignore, remove from git history
- [ ] B5 — Fix import order in errorHandler.ts: Move import { config } to the top of the file

### Phase 2: Essential Features & Integrations (Days 4-10)

- [ ] Set up Stripe account — Get live API keys (secret + publishable + webhook secret)
- [ ] Set up S3 bucket — Create bucket, IAM user, get access keys. Or use Cloudflare R2 / Supabase Storage (S3-compatible, free tier)
- [ ] Set up Anthropic API key — Get Claude API access for AI description generation
- [ ] Set up SendGrid / email provider — For password resets and email verification
- [ ] B15 + B16 — Wire up email sending: Call sendPasswordResetEmail() and sendVerificationEmail() from auth routes
- [ ] B17 — Secure email verification tokens: Use JWT (like password reset already does) instead of plain base64
- [ ] Configure production environment variables — All required vars from config/index.ts
- [ ] B8 — Validate cost inputs on frontend before submitting
- [ ] B9 — Add debounce to search suggestions
- [ ] B10 — Route Nominatim calls through backend (the backend already has the proper User-Agent header)
- [ ] B14 — Fix report count subquery
- [ ] B19 — Fix analytics purchases to check all guides

### Phase 3: Deployment & Ops (Days 11-15)

- [ ] Choose hosting provider — Railway, Render, Fly.io, or DigitalOcean App Platform (simplest for Express + Postgres)
- [ ] Set up PostgreSQL — Managed DB (Supabase, Neon, or provider's built-in Postgres)
- [ ] Run migrations — Execute npm run db:migrate against production DB
- [ ] Seed demo data — Run npm run db:seed or create initial guides manually
- [ ] Deploy backend API — Dockerize and deploy (fix docker-compose.yml database name first)
- [ ] Build and deploy frontend — npm run build:web, deploy to Vercel / Netlify / Cloudflare Pages
- [ ] Configure CORS — Set CORS_ORIGIN to actual production domain
- [ ] Set up domain & SSL — curiocity.app with HTTPS
- [ ] Configure Stripe webhooks — Point Stripe webhook URL to https://api.curiocity.app/api/webhooks/stripe
- [ ] Add morgan logging — Actually use the imported morgan middleware for request logging
- [ ] Add graceful shutdown — SIGTERM handler to close DB pool and drain HTTP connections
- [ ] Enable TypeScript strict mode — At minimum enable strict: true and fix resulting type errors

### Phase 4: Pre-Launch QA (Days 16-18)

- [ ] Manual end-to-end testing — Register, create guide, purchase guide, export, offline, reviews, comments
- [ ] Test Stripe flow — Full checkout + webhook completion in Stripe test mode
- [ ] Test offline mode — Download guide, go airplane mode, verify guide loads from IndexedDB
- [ ] Test on mobile browsers — Safari iOS, Chrome Android at minimum
- [ ] Test AI features — Generate descriptions, translate, format description
- [ ] Create real seed content — 5-10 actual guides in Rome (your launch market)
- [ ] Clean up stale files — Remove wanderwise_v2.html, old review .md files, css-check.css, app-check.txt, log files

### Phase 5: Soft Launch (Day 19-20)

- [ ] Landing page live — Newsletter signup working
- [ ] Invite 10-20 beta testers — Friends, local creators in Rome
- [ ] Set up error monitoring — Sentry (free tier) for both frontend and backend
- [ ] Set up basic analytics — The analytics tracking endpoint exists; ensure frontend fires events
- [ ] Go live 🚀

---

## TODO: Full Launch (App Stores + Web App)

> **NOTE:** This assumes the MVP web app is live and stable. The full launch adds native apps, polish, and scale.

### Phase A: Native App Setup (Weeks 1-3)

- [ ] Choose framework: React Native (Expo) or Capacitor (wrap existing web app)
  - **Recommended:** Capacitor — you already have a full React web app with Leaflet maps, offline support via IndexedDB, and service worker caching. Capacitor wraps it as a native app with minimal changes
- [ ] Set up Capacitor — npm install @capacitor/core @capacitor/cli, init iOS + Android projects
- [ ] Configure native plugins:
  - @capacitor/geolocation — Replace browser Geolocation API
  - @capacitor/filesystem — For offline guide storage (supplement IndexedDB)
  - @capacitor/push-notifications — Firebase Cloud Messaging (Android) + APNs (iOS)
  - @capacitor/app — Deep linking, back button handling
  - @capacitor/splash-screen — Loading screen
  - @capacitor/status-bar — Style status bar
- [ ] Deep links — Configure curiocity.app/guide/:id to open in the native app
- [ ] Native file sharing — Share guides via native share sheet
- [ ] Test on physical devices — iPhone and Android phone

### Phase B: App Store Requirements (Weeks 2-4)

#### Apple App Store

- [ ] Apple Developer account ($99/year)
- [ ] App icon — 1024×1024 PNG, no transparency, no rounded corners
- [ ] Screenshots — 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 11 Pro Max), 12.9" (iPad Pro) — at least 3 screenshots per size
- [ ] Privacy Policy — Hosted at curiocity.app/privacy (required)
- [ ] Terms of Service — Hosted at curiocity.app/terms
- [ ] App Store description — Title (30 chars), subtitle (30 chars), description (4000 chars), keywords (100 chars)
- [ ] Data collection declarations — Complete App Privacy section (email, location, payment info, usage data)
- [ ] In-App Purchase setup — If selling guides via Stripe outside Apple IAP, you must comply with Apple's rules (physical/digital goods distinction). Walking guides are likely "digital content" requiring IAP or qualifying as "reader" app exception — research this carefully
- [ ] Build and upload — Xcode Archive → App Store Connect
- [ ] Submit for review — Expect 1-3 day review. Common rejection reasons: crashes, broken links, login-only content without demo account
- [ ] Provide demo account — demo@curiocity.app / demo123 for Apple reviewers

#### Google Play Store

- [ ] Google Play Developer account ($25 one-time)
- [ ] App icon — 512×512 PNG
- [ ] Feature graphic — 1024×500 PNG
- [ ] Screenshots — Phone (min 2) and tablet (min 1), 16:9 or 9:16
- [ ] Privacy Policy URL (required)
- [ ] Content rating questionnaire — Complete IARC rating
- [ ] Data safety section — Declare data collection (similar to Apple)
- [ ] Target audience — Declare if the app targets children (it doesn't)
- [ ] Build AAB — Generate signed Android App Bundle
- [ ] Internal testing track — Upload and test with 5+ testers
- [ ] Production release — Submit for review (typically 1-7 days)

### Phase C: Production Infrastructure (Weeks 3-5)

- [ ] CDN — CloudFront or Cloudflare in front of S3 for guide images/audio
- [ ] Redis — For session management, rate limiting, caching (config key REDIS_URL already exists but unused)
- [ ] Database backups — Automated daily backups of PostgreSQL
- [ ] CI/CD pipeline — GitHub Actions for lint → test → build → deploy
- [ ] Monitoring & alerting:
  - Sentry (errors)
  - Uptime monitoring (e.g. Better Uptime, UptimeRobot)
  - Log aggregation (Axiom, Logtail, or provider built-in)
- [ ] Auto-scaling — Configure horizontal scaling on your hosting platform
- [ ] Rate limiting — Move rate limiting to Redis-backed store for multi-instance
- [ ] Staging environment — Separate staging deployment for testing before production
- [ ] Proper infrastructure-as-code — Fill in infra/terraform/ and infra/docker/

### Phase D: Feature Completeness (Weeks 4-8)

- [ ] Email verification flow — Full flow: registration → email → click link → verify
- [ ] Password reset flow — Full flow: forgot password → email → reset form → success
- [ ] Social login — Google + Apple Sign-In (config keys already exist for both)
- [ ] Push notifications — Firebase Cloud Messaging for new followers, guide likes, purchase notifications (schema for push_subscriptions exists)
- [ ] Audio narration — Text-to-speech for guide descriptions (upload UI exists, TTS generation doesn't)
- [ ] Image optimization — Resize/compress uploaded images (Sharp / image CDN)
- [ ] Search improvements — Full-text search with PostgreSQL tsvector instead of LIKE
- [ ] Guide categories page — Dedicated browse-by-category view
- [ ] Creator analytics dashboard — Frontend for the analytics API endpoints (already built)
- [ ] Admin dashboard — Frontend for admin API endpoints (users, guides, reports, revenue)
- [ ] Internationalization (i18n) — UI translations (not just guide content)
- [ ] Accessibility audit — WCAG 2.1 compliance, screen reader testing, keyboard navigation

### Phase E: Testing & Quality (Weeks 5-8)

- [ ] Unit tests — Vitest for backend route handlers and business logic
- [ ] Integration tests — Supertest for API endpoint testing (packages already installed)
- [ ] Frontend tests — React Testing Library / Vitest for component tests
- [ ] E2E tests — Playwright or Cypress for critical user flows
- [ ] Load testing — k6 or Artillery to validate performance under load
- [ ] Security audit — OWASP top 10 checklist, dependency vulnerability scan (npm audit)
- [ ] Performance audit — Lighthouse scores for frontend (aim for 90+ in all categories)

### Phase F: Growth & Marketing (Ongoing)

- [ ] SEO — Server-side rendering or pre-rendering for guide pages (OG image endpoint already exists)
- [ ] Social sharing — Deep link previews with Open Graph metadata
- [ ] Referral program — Frontend UI for the referral API (backend already built)
- [ ] Creator onboarding guide — Tutorial/documentation for new creators
- [ ] Content moderation — Review queue for reported content (API exists, frontend needed)
- [ ] ASO (App Store Optimization) — Keywords, screenshots, A/B test descriptions
- [ ] Community building — Instagram, TikTok presence targeting travelers in Rome
- [ ] Analytics integration — Mixpanel / Amplitude (config keys already in backend)
- [ ] Execute MARKETING_PLAN.md — 6-week organic growth plan targeting Rome

---

## Current State Summary

| Dimension | Status |
|-----------|--------|
| Backend API | ✅ Functional, comprehensive routes. 7 critical bugs, 5 high bugs |
| Frontend | ✅ Functional with major UX. 2 critical bugs, 3 high bugs |
| Database | ✅ Well-designed schema with good indexes and relations |
| Auth | ⚠️ JWT-based, working. Email verification not sent. Password reset not emailed |
| Payments | ⚠️ Stripe integration coded but not configured (no API keys) |
| AI | ⚠️ Anthropic integration coded but not configured (no API key) |
| Storage | ⚠️ S3 integration coded but not configured (no bucket) |
| Offline | ❌ IndexedDB save works, but offline loading is broken (B2) |
| Tests | ❌ Zero tests exist |
| Infrastructure | ❌ Empty Terraform/K8s/Docker configs |
| Monitoring | ❌ No error tracking, no logging, no uptime monitoring |
| Documentation | ❌ Empty ADRs, runbooks, API docs. Stale review files |
| Native Apps | ❌ Not started |

> **TIP:** Estimated time to MVP web launch: ~3 weeks of focused work (1 person full-time). Estimated time to full App Store launch: ~8-10 weeks additional after MVP.
