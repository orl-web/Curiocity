# CurioCity — Day-by-Day Launch Plan

Your first app! This plan gets you from where you are now to a live web app + mobile app in about 30 working days (6 weeks). Each day has 3-5 tasks that should take roughly a full working day. Don't rush — getting things right matters more than speed.

## How to Use This Document

- Work through the days in order — later tasks depend on earlier ones
- Check off items as you complete them: `[ ]` → `[x]`
- If a day takes longer than expected, that's fine — shift everything forward
- Don't skip bug fixes to jump ahead to "fun" stuff — the bugs will bite you later
- When you get stuck for more than 30 minutes, ask for help (me, Stack Overflow, docs)

> **TIP:** Before you start: Make sure you have a clean git branch. Commit after completing each day so you can always roll back.

---

## Week 1 — Fix What's Broken

**Goal:** Make the existing code actually work correctly. No new features, just fixing bugs that would embarrass you in front of users.

### Day 1 — Stripe Webhook Fix + Auth Bugs

These are the bugs that completely prevent payments from working.

- [ ] **Fix webhook body parsing order (~30 min)**
  - File: `app.ts`
  - **Problem:** `express.json()` (line 32) runs before `express.raw()` (line 42). This means Stripe webhooks receive a parsed JSON object instead of the raw buffer they need for signature verification. Payments can never complete.
  - **Fix:** Move line 42 (`app.use('/api/webhooks', express.raw(...))`) to before line 32 (`app.use(express.json(...))`).

- [ ] **Fix password reset — actually send the email (~20 min)**
  - File: `auth.ts` line 69
  - **Problem:** The forgot-password endpoint just `console.log()`s the reset link instead of emailing it. The `sendPasswordResetEmail()` function exists in `utils/email.ts` but is never called.
  - **Fix:** Import and call `sendPasswordResetEmail(email, userRows[0].id)` instead of the `console.log`.

- [ ] **Fix email verification — actually send it on registration (~20 min)**
  - File: `auth.ts` lines 37-41
  - **Problem:** In dev mode, emails are auto-verified. In production, they're not verified AND no verification email is sent.
  - **Fix:** After creating the user, call `sendVerificationEmail(email, userId)`. Keep the auto-verify for dev mode.

- [ ] **Fix email verification token security (~30 min)**
  - File: `email.ts` line 24
  - **Problem:** The verification token is just `base64(JSON)` — anyone can forge one. The password reset already uses JWT properly.
  - **Fix:** Use `jwt.sign({ userId, type: 'verify' }, config.JWT_SECRET, { expiresIn: '24h' })` like the password reset does. Add a corresponding verify-email endpoint.

- [ ] **Fix errorHandler import order (~2 min)**
  - File: `errorHandler.ts` line 98
  - **Fix:** Move `import { config } from '../config'` from the bottom of the file to the top, with the other imports.

> 🧪 **Test it:** Start the dev server (`npm run dev:api`), try registering a user, check the console for errors. Try the `/forgot-password` endpoint.

### Day 2 — Fix the Guide Listing (Core Feature)

The main page shows guides — but filters are broken. Only the last filter actually works.

- [ ] **Fix guide list filter chaining (~1 hour)**
  - File: `guides.ts` lines 43-54
  - **Problem:** Each `.where()` call replaces the previous one instead of combining. So if a user filters by "food" in "Rome", only the city filter applies.
  - **Fix:** Collect all conditions into an array, then apply them together with `and()`:
    ```ts
    const conditions = [eq(guides.isPublished, true)];
    if (category) conditions.push(eq(guides.category, category));
    if (city) conditions.push(eq(guides.city, city));
    // ...etc
    baseQuery = baseQuery.where(and(...conditions));
    ```

- [ ] **Fix translate endpoint — stops are always empty (~30 min)**
  - File: `ai.ts` line 140
  - **Problem:** `guide.stops` is undefined because stops are in a separate table (`guide_stops`), not on the guide object.
  - **Fix:** Before the AI call, fetch stops: `const stops = await db.select().from(guideStops).where(eq(guideStops.guideId, guideId)).orderBy(asc(guideStops.stopOrder))` and use those in the prompt.

- [ ] **Fix earnings query — wrong join (~20 min)**
  - File: `users.ts` line 30
  - **Problem:** Uses `eq(payments.guideId, guides.id)` in WHERE instead of a proper JOIN. Returns wrong numbers.
  - **Fix:** Rewrite as:
    ```ts
    db.select({ total: sqlCOALESCE(SUM(creator_earnings), 0) })
      .from(payments)
      .innerJoin(guides, eq(payments.guideId, guides.id))
      .where(and(eq(guides.creatorId, req.user!.userId), eq(payments.status, 'completed')))
    ```

- [ ] **Fix payout mismatched queries (~20 min)**
  - File: `payments.ts` lines 111, 116
  - **Problem:** The SUM query finds payments by `guides.creatorId` but the UPDATE marks payments by `payments.userId`. These could be different.
  - **Fix:** Make both queries consistent — use a subquery to get guide IDs by creator, then match payments by those guide IDs.

> 🧪 **Test it:** Go to the home page, try filtering by category + city at the same time. Check that both filters work together.

### Day 3 — Fix Frontend Bugs

- [ ] **Fix XSS in map popups (~30 min)**
  - File: `LeafletMap.tsx` lines 82-85
  - **Problem:** Stop names from user input or GPS imports are injected directly into HTML. A malicious stop name like `<img src=x onerror=alert('hacked')>` executes JavaScript.
  - **Fix:** Install dompurify (`npm install dompurify @types/dompurify --workspace=apps/web`) and sanitize all user content before inserting into popups. Or better: use Leaflet's text-only `.bindTooltip()` instead of `.bindPopup()` with raw HTML.

- [ ] **Fix offline mode — the whole point of saving guides (~45 min)**
  - File: `GuidePage.tsx` lines 167-180
  - **Problem:** When the API call fails (no internet), the app shows an error instead of loading the guide from IndexedDB.
  - **Fix:** Wrap the API call in try/catch. In the catch block, try `getGuideOffline(guideId)`. Only show the error if BOTH the API and IndexedDB fail.

- [ ] **Fix NaN costs sent to backend (~15 min)**
  - File: `CreatePage.tsx` lines 134-137
  - **Fix:** After `parseFloat()`, check `isNaN()`. If it's NaN, either set to 0 or show a validation error.

- [ ] **Fix search API spam — debounce suggestions (~20 min)**
  - File: `HomePage.tsx` lines 54-60
  - **Fix:** Use the existing `debouncedSearch` value (or add a 300ms debounce with `setTimeout`/`useEffect` cleanup) before calling `fetchSuggestions()`.

- [ ] **Fix Nominatim User-Agent violation (~15 min)**
  - File: `CreatePage.tsx` line 65
  - **Fix:** Route the geocoding call through your backend (`/api/geocode`) instead of calling Nominatim directly from the browser. The backend already has the proper User-Agent header.

> 🧪 **Test it:** Create a guide with stops, check the map popups. Save a guide for offline, turn off wifi, reload the guide page.

### Day 4 — Fix Remaining Backend Bugs + Cleanup

- [ ] **Fix admin report count (~15 min)**
  - File: `reports.ts` line 62
  - **Problem:** Subquery compares `reports.targetType = reports.targetType` (column to itself — always true).
  - **Fix:** Use literal parameter values from the outer query row.

- [ ] **Fix analytics purchases counting only first guide (~10 min)**
  - File: `analytics.ts` line 57
  - **Fix:** Change `eq(payments.guideId, guideIdList[0])` to `inArray(payments.guideId, guideIdList)`.

- [ ] **Remove .env from git (~15 min)**
  - Add `services/api/.env` to `.gitignore`
  - Run: `git rm --cached services/api/.env && git commit -m "Remove .env from tracking"`
  - Create `.env.example` with placeholder values

- [ ] **Clean up stale files (~20 min)**
  - Delete or archive: `wanderwise_v2.html`, `css-check.css`, `app-check.txt`, `backend.log`, `frontend.log`, `vite.log`
  - Delete old review docs: `PROJECT_REVIEW.md`, `PROJECT_REVIEW_v2.md`, `WANDERWISE_*.md`, `SUBAGENT_TASKS.md`, `TEMP_FIXES.md`
  - Update `PROGRESS_MVP.md` to reflect current state or delete it

- [ ] **Delete empty directories (~5 min)**
  - `services/api/routes/`, `services/api/middleware/`, `services/api/models/`, `services/api/utils/` (the empty top-level ones, not the ones under `src/`)

- [ ] **Add morgan request logging (~10 min)**
  - File: `app.ts`
  - `morgan` is already imported but never used. Add `app.use(morgan('combined'))` after helmet.

> 🧪 **Test it:** Run both frontend and backend, click through every page. Make sure nothing crashes.

### Day 5 — Git Cleanup + Verify All Bug Fixes

- [ ] Commit all Week 1 fixes on a clean branch
- [ ] Full manual smoke test — go through every feature:
  - Register a new account
  - Log in / log out
  - Browse guides, apply filters (category + city together)
  - Open a guide detail page
  - Create a new guide with stops
  - Save/bookmark a guide
  - Leave a review
  - Leave a comment
  - View creator profile
  - Follow/unfollow a user
  - Export a guide as GPX/KML/JSON
  - Save guide for offline, reload
  - Test map popups (no XSS)
- [ ] Fix anything that broke during testing
- [ ] Merge to main once everything works

> **IMPORTANT Checkpoint:** At this point, CurioCity works correctly locally. Every core feature functions. Nothing is live yet — that's next week.

---

## Week 2 — Set Up Services & Accounts

**Goal:** Get all the third-party services you need and wire them into the app.

### Day 6 — Stripe Setup (Payments)

> **NOTE:** Stripe is how creators get paid and how users buy guides. This is your revenue engine.

- [ ] **Create a Stripe account at stripe.com**
  - Use your real business details (Stripe requires this for payouts)
  - Complete identity verification
- [ ] **Get your API keys from Stripe Dashboard → Developers → API Keys**
  - Copy the test mode keys first (you'll switch to live later)
  - `STRIPE_SECRET_KEY` = Secret key (starts with `sk_test_...`)
  - `STRIPE_PUBLISHABLE_KEY` = Publishable key (starts with `pk_test_...`)
- [ ] **Set up Stripe Connect (so creators can receive payouts)**
  - Dashboard → Settings → Connect → Get started
  - Choose "Express" account type
  - Copy the `STRIPE_CONNECT_CLIENT_ID`
- [ ] **Create a webhook endpoint (we'll point it to the real URL later)**
  - Dashboard → Developers → Webhooks → Add endpoint
  - For now, use a placeholder URL
  - Select events: `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_failed`, `account.updated`
  - Copy the `STRIPE_WEBHOOK_SECRET` (starts with `whsec_...`)
- [ ] **Update your .env with all Stripe keys**

> 🧪 **Test it:** Run the backend, try the `/api/payments/checkout` endpoint with a test guide. You should get a Stripe checkout URL.

### Day 7 — Storage + AI Setup

- [ ] **Set up S3-compatible storage (~45 min)**
  - Recommended for first app: **Cloudflare R2** — free tier is generous (10GB storage, 10M reads/month), S3-compatible API
  - Alternative: Supabase Storage or AWS S3
  - Create a bucket named `curiocity-uploads`
  - Create API keys with read/write access
  - Update `.env`: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`
  - If using R2: set the S3 endpoint URL in the S3Client config
- [ ] **Get an Anthropic API key (~15 min)**
  - Sign up at console.anthropic.com
  - Create an API key
  - Add credits ($5-10 is enough for months of testing)
  - Update `.env`: `ANTHROPIC_API_KEY`
- [ ] **Test AI description generation**
  - Call `POST /api/ai/generate-descriptions` with a city, category, and stops
  - Verify you get back generated descriptions
- [ ] **Test file upload**
  - Call `POST /api/upload/presign` with a content type and filename
  - Verify you get back a signed upload URL
  - Try uploading a small image to the signed URL

### Day 8 — Email + Domain Setup

- [ ] **Set up email sending (~30 min)**
  - Recommended: **Resend** (free tier: 3000 emails/month, modern API) or SendGrid (your code already uses it)
  - If using SendGrid: create account → verify sender → create API key
  - Update `.env`: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- [ ] **Test email sending**
  - Register a new user, check that verification email arrives
  - Try forgot-password, check that reset email arrives
- [ ] **Buy your domain (~20 min)**
  - Register `curiocity.app` (or your chosen domain) on Cloudflare, Namecheap, or Google Domains
  - You'll configure DNS records during deployment (Week 3)
- [ ] **Write your Privacy Policy (~1 hour)**
  - This is required by both app stores and GDPR
  - Use a generator like Termly or PrivacyPolicies.com as a starting point
  - Key things to cover: what data you collect (email, location, payment info), how you use it, third-party services (Stripe, Anthropic, analytics), user rights (deletion, export)
  - Save as a page at `/privacy` in your frontend
- [ ] **Write your Terms of Service (~45 min)**
  - Also required by app stores
  - Cover: acceptable use, content ownership (creators keep rights), payment terms, liability limits
  - Save as a page at `/terms` in your frontend

### Day 9 — Choose Hosting & Prepare for Deployment

> **TIP:** For your first app, pick a platform that handles infrastructure for you. You don't need Kubernetes or Terraform yet.

- [ ] **Choose a hosting platform for the backend**
  - Recommended: **Railway** — easiest for Express + PostgreSQL. Free trial, then ~$5-20/month
  - Alternatives: Render, Fly.io, DigitalOcean App Platform
- [ ] **Choose a hosting platform for the frontend**
  - Recommended: **Vercel** — free tier, perfect for Vite/React apps. Instant deploys from git
  - Alternatives: Netlify, Cloudflare Pages
- [ ] **Set up a managed PostgreSQL database**
  - Recommended: **Neon** — free tier with 0.5GB, auto-suspend, perfect for MVP
  - Alternatives: Supabase (free tier), Railway's built-in Postgres
- [ ] **Test your production build locally (~30 min)**
  - Backend: `npm run build:api` — fix any TypeScript errors
  - Frontend: `npm run build:web` — fix any build errors
  - Run the built backend: `node services/api/dist/index.js` — verify it starts
- [ ] **Create a Dockerfile for the backend if one doesn't exist (~20 min)**
  - Check if `services/api/Dockerfile` exists and works
  - If not, create a simple one based on `node:20-alpine`

### Day 10 — Graceful Shutdown + Production Hardening

- [ ] **Add graceful shutdown (~20 min)**
  - File: `index.ts`
  - Add `SIGTERM` and `SIGINT` handlers that close the HTTP server and DB pool:
    ```ts
    const server = app.listen(PORT, HOST, () => { ... });
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down...');
      server.close(() => process.exit(0));
    });
    ```
- [ ] **Enable TypeScript strict mode (~1-2 hours)**
  - File: `tsconfig.json`
  - Set `"strict": true` — this will show type errors you've been missing
  - Fix the errors one by one. Most will be `possibly undefined` checks
  - This prevents entire categories of runtime bugs
- [ ] **Set up Sentry error tracking (~30 min)**
  - Sign up at sentry.io (free tier: 5000 errors/month)
  - `npm install @sentry/node --workspace=services/api`
  - Initialize Sentry in `index.ts` before anything else
  - Add Sentry to the frontend too: `npm install @sentry/react --workspace=apps/web`
- [ ] **Add a health check with DB verification (~15 min)**
  - The existing `/health` endpoint doesn't check if the database is reachable
  - Add a simple `SELECT 1` query to verify DB connectivity

> **IMPORTANT Checkpoint:** All services are configured. The app works locally with real Stripe, S3, email, and AI. You're ready to deploy.

---

## Week 3 — Deploy the Web App

**Goal:** Get CurioCity live on the internet. Real users can access it.

### Day 11 — Deploy the Database

- [ ] Create production database on your chosen provider (Neon/Supabase/Railway)
- [ ] Copy the connection string — it looks like `postgresql://user:pass@host:5432/dbname?sslmode=require`
- [ ] Run migrations against production DB:
  ```bash
  DATABASE_URL="your-production-url" npm run db:migrate
  ```
- [ ] Seed initial data — either run the seed script or create data manually:
  ```bash
  DATABASE_URL="your-production-url" npm run db:seed
  ```
- [ ] Verify — connect to the DB with a tool like TablePlus or psql and check tables exist

### Day 12 — Deploy the Backend

- [ ] Push your code to GitHub (if not already)
- [ ] Create a new project on Railway/Render/Fly.io
- [ ] Connect your GitHub repo — point to `services/api`
- [ ] Set ALL environment variables in the hosting platform's dashboard:
  - `NODE_ENV=production`
  - `PORT=3001`
  - `DATABASE_URL` (from Day 11)
  - `JWT_SECRET` (generate a long random string: `openssl rand -hex 32`)
  - `JWT_REFRESH_SECRET` (another random string)
  - `CORS_ORIGIN` (will be your frontend URL — set a placeholder for now)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`
  - `ANTHROPIC_API_KEY`
  - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`
  - `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- [ ] Deploy — trigger a build and wait for it to succeed
- [ ] Test the health endpoint: `curl https://your-api-url.up.railway.app/health`
- [ ] Test an API call: `curl https://your-api-url.up.railway.app/api/guides`

### Day 13 — Deploy the Frontend

- [ ] Update the frontend API base URL to point to your production backend
  - Find where `localhost:3001` or the API URL is configured in the frontend
  - Set it to your production API URL (e.g., `https://api.curiocity.app`)
- [ ] Deploy to Vercel/Netlify
  - Connect GitHub repo, point to `apps/web`
  - Set build command: `npm run build` (from the workspace root) or `cd apps/web && npm run build`
  - Set output directory: `apps/web/dist`
- [ ] Update CORS on the backend
  - Set `CORS_ORIGIN` to your frontend URL (e.g., `https://curiocity.app`)
- [ ] Configure DNS — point your domain to the hosting providers
  - Frontend: Add CNAME record for `curiocity.app` → Vercel/Netlify
  - Backend: Add CNAME for `api.curiocity.app` → Railway/Render
- [ ] Verify HTTPS — both frontend and backend should have SSL certificates (hosting platforms provide this automatically)

> 🧪 **Test it:** Open `https://curiocity.app` in a browser. Register, browse guides, open a guide detail page.

### Day 14 — Stripe Webhooks + Final Wiring

- [ ] Update Stripe webhook URL to your production API:
  - Stripe Dashboard → Webhooks → Update endpoint URL to `https://api.curiocity.app/api/webhooks/stripe`
- [ ] Test the full payment flow:
  - Use Stripe test card `4242 4242 4242 4242`
  - Create a paid guide, try to purchase it with another account
  - Check that the webhook fires and the payment status updates to "completed"
- [ ] Test Stripe Connect onboarding:
  - Log in as a creator, trigger the Stripe Connect onboarding flow
  - Complete the test onboarding
- [ ] Test email in production:
  - Register a new account — does verification email arrive?
  - Try forgot password — does reset email arrive?
  - Check email deliverability (not landing in spam)
- [ ] Test AI features in production:
  - Generate descriptions for stops
  - Format a description
  - Translate a guide

### Day 15 — Create Real Content + Soft Launch Prep

- [ ] **Create 5-8 real guides in Rome (your launch market)**
  - Mix of categories: food, architecture, history, art
  - Each guide should have 3-6 stops with real coordinates
  - Add descriptions, either manually or via AI generation
  - Add real photos if you have them
- [ ] **Create your creator profile — bio, avatar, location**
- [ ] **Test on mobile browsers — this is critical since people use the app while walking:**
  - Safari on iPhone
  - Chrome on Android
  - Check map interactions work on touch
  - Check GPS location works
- [ ] **Set up uptime monitoring (~10 min)**
  - Use UptimeRobot (free: 50 monitors) or Better Stack
  - Monitor your health endpoint: `https://api.curiocity.app/health`

> **IMPORTANT Checkpoint:** 🎉 Your web app is LIVE! People can visit curiocity.app, register, browse guides, and buy them. Now let's make a native app.

---

## Week 4 — Native App with Capacitor

**Goal:** Wrap your web app as a native iOS + Android app using Capacitor.

> **NOTE:** Why Capacitor? You already have a full React web app. Capacitor wraps it into a native app container without rewriting anything. You keep one codebase for web + iOS + Android.

### Day 16 — Set Up Capacitor

- [ ] **Install Capacitor (~20 min)**
  ```bash
  cd apps/web
  npm install @capacitor/core @capacitor/cli
  npx cap init "CurioCity" "app.curiocity" --web-dir dist
  ```
- [ ] **Add iOS and Android platforms**
  ```bash
  npm install @capacitor/ios @capacitor/android
  npx cap add ios
  npx cap add android
  ```
- [ ] **Install essential plugins**
  ```bash
  npm install @capacitor/geolocation @capacitor/app @capacitor/splash-screen @capacitor/status-bar @capacitor/haptics
  ```
- [ ] **Build the web app and sync**
  ```bash
  npm run build
  npx cap sync
  ```
- [ ] **Test on a simulator/emulator**
  - iOS: `npx cap open ios` → Run in Xcode simulator
  - Android: `npx cap open android` → Run in Android Studio emulator

### Day 17 — Native Adjustments

- [ ] **Configure splash screen (~30 min)**
  - Create a splash screen image (your logo on brand-color background)
  - Configure in `capacitor.config.ts`:
    ```ts
    plugins: {
      SplashScreen: {
        launchShowDuration: 2000,
        backgroundColor: '#1D9E75',
      }
    }
    ```
- [ ] **Configure status bar (~10 min)**
  ```ts
  import { StatusBar, Style } from '@capacitor/status-bar';
  StatusBar.setStyle({ style: Style.Light });
  StatusBar.setBackgroundColor({ color: '#1D9E75' });
  ```
- [ ] **Handle the Android back button (~15 min)**
  ```ts
  import { App } from '@capacitor/app';
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
  ```
- [ ] **Replace browser geolocation with Capacitor plugin (~30 min)**
  - Capacitor's geolocation plugin handles native permissions properly
  - Update your geolocation calls to use `@capacitor/geolocation`
- [ ] **Test deep links** — `curiocity.app/guide/:id` should open in the app if installed

### Day 18 — App Icons + Screenshots

- [ ] **Create your app icon (~1 hour)**
  - Design a 1024×1024 PNG icon (no transparency for iOS, transparency OK for Android)
  - Tools: Figma, Canva, or commission on Fiverr
  - Use a tool to generate all sizes: `capacitor-assets` or `appicon.co`
  - Copy generated icons to `ios/App/App/Assets.xcassets` and `android/app/src/main/res/`
- [ ] **Take App Store screenshots (~1 hour)**
  - You need screenshots for:
    - iPhone 6.7" (1290×2796) — iPhone 15 Pro Max
    - iPhone 6.5" (1242×2688) — iPhone 11 Pro Max
    - iPad 12.9" (2048×2732) — if supporting iPad
  - Capture 3-5 screenshots showing: home page, guide detail, map view, guide creation, profile
  - Use the simulator for consistent screenshots
  - Add marketing text overlays using Figma/Canva
- [ ] **Create Google Play feature graphic** — 1024×500 PNG
- [ ] **Write your app description (used by both stores)**
  - Title: "CurioCity" (30 chars max for Apple)
  - Subtitle: "Walk. Discover. Be Curious." (30 chars max)
  - Full description: Highlight key features, mention Rome, focus on the "curiosity" angle
  - Keywords (Apple only, 100 chars): `travel,walking,guides,tour,rome,explore,curious,maps,local`

### Day 19 — QA Day

- [ ] **Full end-to-end test on iOS simulator:**
  - Register/login
  - Browse and filter guides
  - Open guide detail, interact with map
  - Create a new guide
  - Purchase a guide (Stripe test mode)
  - Save for offline, test offline viewing
  - GPS location on map
  - Leave review and comment
  - Profile editing
  - Export guide as GPX
- [ ] **Full end-to-end test on Android emulator** — same checklist
- [ ] **Test on a REAL physical device (at least one)**
  - For iOS: connect your iPhone, build and install via Xcode
  - For Android: enable USB debugging, install via Android Studio
  - Walk around outside and test GPS + map with real location
- [ ] **Fix any issues found**
- [ ] **Performance check**
  - Open Chrome DevTools → Lighthouse → Run audit on your web app
  - Aim for 80+ on Performance, Accessibility, Best Practices

### Day 20 — Buffer / Fix Day

This day is intentionally empty for catching up on anything that took longer than expected.

- [ ] Fix any remaining issues from QA
- [ ] Polish UI inconsistencies noticed during testing
- [ ] Ensure all environment variables are properly set in production
- [ ] Commit and push everything clean

> **IMPORTANT Checkpoint:** You have a working web app live at curiocity.app AND native iOS/Android builds ready. Time to submit to the stores.

---

## Week 5 — App Store Submissions

**Goal:** Submit to Apple App Store and Google Play Store.

### Day 21 — Apple App Store Submission

- [ ] **Create an Apple Developer account at developer.apple.com**
  - Costs $99/year
  - Enrollment takes 24-48 hours to approve — do this early!
- [ ] **Create your app in App Store Connect**
  - appstoreconnect.apple.com
  - New App → fill in name, primary language, bundle ID (`app.curiocity`), SKU
- [ ] **Fill in app metadata:**
  - Description, keywords, screenshots (from Day 18)
  - Privacy Policy URL: `https://curiocity.app/privacy`
  - Support URL, marketing URL
  - Age rating: 4+ (no objectionable content)
  - App Privacy: declare data collection (email, location, payment info)
- [ ] **Provide demo credentials for Apple review team:**
  - Email: `demo@curiocity.app`
  - Password: `demo123`
  - Add notes explaining what the app does and how to test it
- [ ] **Build and upload via Xcode:**
  - Product → Archive
  - Distribute App → App Store Connect
  - Wait for processing (10-30 minutes)
  - Select the build in App Store Connect
- [ ] **Submit for review**
  - Typical review time: 1-3 days
  - Common rejection reasons to avoid:
    - Crashes or broken features
    - Login wall without demo account
    - Incomplete metadata
    - Links that don't work

### Day 22 — Google Play Store Submission

- [ ] **Create a Google Play Developer account at play.google.com/console**
  - Costs $25 one-time
- [ ] **Create your app in the Play Console**
  - App name, default language, app/game, free/paid
- [ ] **Complete the Store Listing:**
  - Short description (80 chars), full description (4000 chars)
  - Screenshots (from Day 18), feature graphic
  - Privacy Policy URL
- [ ] **Complete required declarations:**
  - Content rating questionnaire (IARC)
  - Target audience and content (not for children)
  - Data safety section
  - Ads declaration (select "Yes" if using ad-unlocked guides)
- [ ] **Build a signed Android App Bundle (AAB):**
  - In Android Studio: Build → Generate Signed Bundle
  - Create a keystore file — KEEP THIS SAFE, you can never replace it
- [ ] **Upload to Internal Testing track first**
  - Add 5+ test email addresses
  - Wait for them to test and confirm it works
- [ ] **Promote to Production and submit for review**
  - Review time: 1-7 days (first submission often takes longer)

### Day 23 — Set Up CI/CD

While waiting for store reviews, set up automated deployments.

- [ ] **Create GitHub Actions workflow for the backend:**
  ```yaml
  # .github/workflows/deploy-api.yml
  name: Deploy API
  on:
    push:
      branches: [main]
      paths: ['services/api/**']
  jobs:
    deploy:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20 }
        - run: npm ci
        - run: npm run build:api
        # Add your platform-specific deploy step
  ```
- [ ] **Create GitHub Actions workflow for the frontend** (or use Vercel's auto-deploy from git)
- [ ] **Set up automated database backups**
  - Most managed Postgres providers include daily backups
  - Verify backups are enabled and test a restore
- [ ] **Document your deployment process** — write a simple `DEPLOY.md` with:
  - How to deploy backend
  - How to deploy frontend
  - How to run migrations
  - Where secrets are stored

### Day 24 — Respond to Store Reviews + Polish

- [ ] **Check App Store Connect for review status**
  - If rejected: read the rejection reason carefully, fix the issue, resubmit
  - Common fixes: add a demo account, fix a crash, update screenshots
- [ ] **Check Google Play Console for review status**
  - If rejected: address the policy violation, resubmit
- [ ] **While waiting, add polish:**
  - Add loading skeletons to guide list (instead of spinners)
  - Improve empty states ("No guides found — be the first to create one!")
  - Test and fix any 404 pages
  - Add a proper "About" page

### Day 25 — Buffer / Fix Day

- [ ] Address any store rejection feedback
- [ ] Fix issues found by beta testers
- [ ] Polish, polish, polish

> **IMPORTANT Checkpoint:** Your apps are submitted (or approved!) on both stores. The web app is live. You have a working product.

---

## Week 6 — Launch & Grow

**Goal:** Tell the world. Get your first real users.

### Day 26 — Launch Prep

- [ ] **Switch Stripe to live mode**
  - Replace test API keys with live keys in production
  - Update webhook endpoint to use live signing secret
  - Test with a real $0.99 purchase (refund yourself after)
- [ ] **Write your launch posts:**
  - Instagram: visuals of Rome guides with app screenshots
  - Twitter/X: thread about building the app
  - Reddit: r/travel, r/rome, r/digitalnomad (follow each sub's self-promo rules)
  - Product Hunt: prepare a listing at producthunt.com
- [ ] **Prepare your landing page for sharing**
  - Clear value prop: "Discover Rome's hidden curiosities with walking guides created by locals"
  - App Store / Play Store badges linking to your apps
  - Email signup for newsletter

### Day 27 — Launch Day 🚀

- [ ] Launch on Product Hunt (schedule for Tuesday-Thursday, early morning US time)
- [ ] Post on social media — all prepared posts
- [ ] Tell friends and family — ask them to download, leave a review
- [ ] Monitor Sentry — watch for any errors from real users
- [ ] Monitor server health — check CPU, memory, database connections
- [ ] Respond to any user feedback immediately

### Day 28 — Post-Launch Monitoring

- [ ] Check analytics: How many signups? How many guide views? Any purchases?
- [ ] Read app store reviews and respond to every one
- [ ] Fix any bugs reported by real users (these are top priority)
- [ ] Check error monitoring — any new Sentry errors?
- [ ] Check email deliverability — are emails landing in spam?

### Day 29 — First Iteration

- [ ] Prioritize feedback — what are users asking for most?
- [ ] Quick wins — fix any UX issues users reported
- [ ] Reach out to 5 potential creators in Rome:
  - Local food bloggers
  - Tour guides going independent
  - Architecture enthusiasts
  - History buffs
  - Photography walking tour leaders

### Day 30 — Plan What's Next

- [ ] Write a retrospective: What went well? What was hard? What would you do differently?
- [ ] Plan the next 4 weeks of features based on user feedback
- [ ] Set up a regular rhythm:
  - Weekly: check analytics, fix bugs, respond to reviews
  - Monthly: ship one new feature
  - Quarterly: review growth metrics, adjust strategy

---

## Quick Reference: What You Need to Sign Up For

| Service | Cost | What For |
|---------|------|----------|
| Stripe | Free + 2.9% per transaction | Payments |
| Cloudflare R2 | Free tier (10GB) | Image/audio storage |
| Anthropic | ~$5-10 to start | AI descriptions |
| Railway | ~$5-20/month | Backend hosting |
| Neon | Free tier | PostgreSQL database |
| Vercel | Free tier | Frontend hosting |
| SendGrid or Resend | Free tier | Transactional email |
| Sentry | Free tier (5K errors) | Error monitoring |
| UptimeRobot | Free tier | Uptime monitoring |
| Apple Developer | $99/year | iOS App Store |
| Google Play Developer | $25 one-time | Google Play Store |
| Domain registrar | ~$10-15/year | curiocity.app |

**Total monthly cost for MVP:** ~$15-30/month + $124 one-time for app stores + domain

> **TIP:** You're building something real. Most people never ship. Follow this plan day by day and in 6 weeks you'll have a live app on two app stores and the web. You've got this. 💪
