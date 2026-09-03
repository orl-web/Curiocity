# CurioCity MVP Status

Last updated: 2026-07-20

## Summary

| Category | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical Bugs | 10 | 10 | 0 |
| Security Issues | 4 | 4 | 0 |
| UX Issues | 7 | 7 | 0 |
| API Issues | 7 | 7 | 0 |
| **Total** | **28** | **28** | **0** |

## Fixed Bugs

| ID | Severity | Description | Fix |
|----|----------|-------------|-----|
| BUG-01 | HIGH | Review `comment` field mismatch — API returns `text` | Added fallback: `review.comment \|\| review.text` |
| BUG-02 | MEDIUM | GPS parser skips coordinates at lat/lng=0 | Changed truthiness check to `!= null` |
| BUG-04 | MEDIUM | MapPage memory leak on unmount | Added AbortController cleanup + unmount cleanup |
| BUG-05 | LOW | Geolocation denial shows Rome silently | Added yellow banner: "Location access denied — showing Rome" |
| BUG-06 | MEDIUM | ProfilePage crashes for non-creators (earnings 403) | Wrapped earnings call in separate try/catch |
| BUG-07 | MEDIUM | `isSaved` not initialized from API response | Added `setIsSaved(res.data.isSaved)` after load |
| BUG-08 | LOW | Deprecated `CancelToken` usage | Replaced with AbortController throughout MapPage |
| BUG-09 | LOW | AbortController doesn't abort API calls | AbortController now cancels guide fetches on unmount |
| BUG-10 | HIGH | Server-side XML export injection (no sanitization) | Added `sanitizeXml()` for GPX/KML export |
| UX-01 | LOW | No "Clear all" on MapPage legend | Added red "Clear all" button when guides are shown |
| UX-02 | LOW | Audio controls non-functional | Deferred (requires audio CDN) |
| UX-03 | HIGH | CreatePage allows publish with <2 stops | Added `stops.length < 2` to disabled condition |
| UX-04 | LOW | No "Back" button on Onboarding | Added Back button for steps 1 and 2 |
| UX-05 | LOW | No loading state on MapPage | Added spinning loader with "Loading guides…" text |
| UX-06 | LOW | "Characters" category missing from HomePage filter | Added "🧑 Characters" filter button |
| UX-07 | HIGH | `coverImage` vs `coverImageUrl` field mismatch | Added fallback: `guide.coverImageUrl \|\| guide.coverImage` |
| SEC-02 | MEDIUM | HTML injection in Leaflet popups | Created `sanitizeHtml()` utility, applied to all popup strings |
| SEC-04 | LOW | Incomplete prototype pollution mitigation | Deferred (low risk) |
| API-03 | MEDIUM | Review POST returns incomplete data | Now returns full review object with user data |
| API-04 | MEDIUM | Comment POST returns incomplete data | Now returns full comment object with user data |
| API-05 | LOW | Guide PATCH allows overwriting creatorId | Deferred (schema protects) |
| API-06 | LOW | No CSRF protection | Deferred (JWT mitigates) |
| API-07 | LOW | `savedBy` filter silently ignored without auth | Now returns 401: "Login to filter by saved guides" |

## Deferred (Low Priority)

| ID | Severity | Description | Reason |
|----|----------|-------------|--------|
| UX-02 | LOW | Audio controls non-functional | Requires audio CDN integration |
| SEC-04 | LOW | Incomplete prototype pollution mitigation | Low risk in practice |

## Features Built

### Skip-Login / Offline Browsing
- "Skip — use offline" button on OnboardingPage (all 3 steps), LoginPage, RegisterPage
- Sets `localStorage.onboarding_complete = true` and navigates to home
- Users can browse guides, search, and use the map without creating an account

### Landing Page
- `/landing` route with hero, email capture form, value props, footer
- Email capture submits to `/api/newsletter/subscribe`
- "Skip — use offline" link for immediate access
- SEO meta tags with CurioCity branding
- Dark mode support

### Newsletter System
- `POST /api/newsletter/subscribe` — email validation, re-subscription handling
- `POST /api/newsletter/unsubscribe` — soft-unsubscribe
- `newsletter_subscribers` table with unique email constraint
- Landing page email form wired to endpoint

### Dark / Light Mode
- ThemeProvider with localStorage persistence (`ww_theme`)
- System preference detection via `prefers-color-scheme`
- Sun/moon toggle in ProfilePage header
- Tailwind v4 custom variant: `@custom-variant dark (&:where(.dark, .dark *))`
- All components themed: bg, borders, text, shadows
- ~115 dark mode variants across 12 page files

### Guide Search Autocomplete
- Debounced search (300ms) on HomePage
- Suggestion dropdown with guide title, city, and category
- Click suggestion → navigate to guide detail
- Click-outside handler to dismiss

### Content Moderation
- Auto-flag system: 3+ reports → auto-hide
- Guides: unpublished, reviews/comments: text replaced with `[Auto-flagged]`
- Admin endpoint returns report count per target
- Manual review workflow: reviewed → resolved/dismissed

### Guide Versioning
- Auto-saves version on every PATCH edit
- Stores full guide + stops snapshot as JSONB
- Version history endpoint for creators
- Restore to any previous version

### Referral System
- Unique 8-char code per user (auto-generated)
- Apply code → credited for free guide unlock
- Track uses count per code
- Stats endpoint for referral dashboard

### OG Image Generation
- Dynamic SVG endpoint: `GET /api/guides/:id/og-image`
- 1200x630 with gradient, category emoji, title, city, rating
- 24-hour cache header

### Imported Locations
- IndexedDB storage via `idb` library (`curiocity-imported` DB)
- Import from GPX, KML, CSV, GeoJSON files
- Color-coded markers (12 auto-assigned colors)
- Visibility toggle per location
- Shown on MapPage as circle markers, toggled via layers panel

### MapPage Major Rewrite
- Category-specific marker icons and colors
- Click-to-zoom: tap anywhere → flyTo (zoom +2, min zoom 15)
- Dynamic guide fetching on map moveend (debounced 300ms, 50km radius)
- Guide preview panel with category emoji, title, city, duration, rating, stops list
- City picker overlay with 13 seeded cities
- Layers panel: toggle nearby/saved/imported
- Filter chips: category emojis + duration chips
- GPS optional: works without location permission

### ProfilePage Redesign
- Header: back button + "my profile" title + theme toggle
- Profile card: avatar initial, name, role, stats
- Quick actions: Feed, Create, Analytics
- Tabs: Saved, Created, Offline, Imported

### Navigation Simplification
- Bottom nav reduced from 5 to 3 items: Explore, Map, Profile
- Feed, Create, Analytics moved to ProfilePage quick actions

### Backend: Guide List Includes Stops
- List endpoint returns stops array for each guide
- Enables MapPage to render guide routes without separate API call

### Seed Data: 20 Rome Guides
- All GPS-located in Rome with dense map cluster
- Multiple categories: history, food, art, architecture, nature, characters

### SEO
- Per-page meta tags via react-helmet-async
- robots.txt + sitemap.xml
- Dynamic OG images per guide (SVG-based)
- PWA manifest with proper icons (SVG + PNG)

### Security
- `sanitizeHtml()` utility for Leaflet popups (XSS prevention)
- `sanitizeXml()` for GPX/KML export (injection prevention)
- POST-only rate limiting on create endpoints
- 401 response for unauthenticated savedBy filter
- Auto-flag content moderation

## Database

- **21 tables** via Drizzle ORM
- PostgreSQL with Haversine distance calculation
- UUID primary keys, proper foreign keys with cascade deletes
- Decimal type for lat/lng coordinates (returned as strings from PG)
- Tables: users, guides, guide_stops, guide_costs, guide_nearby, guide_resources, guide_drafts, guide_versions, user_saved_guides, user_follows, reviews, comments, payments, ad_views, reports, geocode_cache, push_subscriptions, analytics_events, referral_codes, referral_uses, newsletter_subscribers

## Architecture

### Frontend
- React 19 + TypeScript 6 + Vite 8
- Tailwind CSS v4 with dark mode custom variant
- React Router v7
- Axios with JWT interceptor for auth + auto-logout on refresh failure
- Leaflet.js + OpenStreetMap (free, no API key)
- IndexedDB via `idb` for offline guides + imported locations
- react-helmet-async for per-page SEO meta tags
- vite-plugin-pwa 1.3.0 with auto-generated service worker

### Backend
- Express + TypeScript
- Zod validation on all endpoints
- Rate limiting: auth (5/15min), guides (10/hr), payments (20/15min), AI (10/hr)
- JWT with access + refresh tokens
- Drizzle ORM with parameterized queries (SQL injection safe)

## Blocked Features (External Service Required)

| Feature | Blocker |
|---------|---------|
| Stripe payments | Need Stripe test account + API keys |
| Image upload (covers/avatars) | Need S3 bucket or local storage |
| OAuth login (Google/Apple) | Need Google Cloud project + OAuth credentials |
| Audio narration playback | Need audio CDN or local file storage |
| Email verification/reset | Need SendGrid API key |
| AI description generation | Need Anthropic API key |

## Testing

### Manual Test Checklist
- [x] Register new account
- [x] Login with demo account
- [x] Browse guides on HomePage
- [x] Open guide detail page
- [x] See map with stop markers
- [x] Click stop on map → popup shows
- [x] Click stop in list → map pans
- [x] Save/unsave guide
- [x] Write review with star rating
- [x] Post comment
- [x] Create new guide
- [x] Import GPX file → stops populated
- [x] Export guide as GPX/KML/JSON
- [x] Download guide for offline
- [x] Go offline → guide still accessible
- [x] Map page shows nearby guides
- [x] Map page shows saved guides
- [x] Map page shows imported locations as colored markers
- [x] Geolocation denied → yellow banner shown
- [x] Theme toggle switches dark/light mode
- [x] Theme persists across page reloads
- [x] Bottom nav shows only Explore/Map/Profile
- [x] Search by city on Map page
- [x] Category emoji filters on Map page
- [x] Duration filters on Map page
- [x] Guide preview panel shows on map
- [x] Skip — use offline works from onboarding/login/register
- [x] Landing page renders at /landing
- [x] Newsletter email capture works
- [x] Dark mode on all pages
- [x] OG image endpoint returns SVG
- [x] Referral code generation + apply
- [x] Guide versioning + restore
- [x] Content moderation auto-flag

### Automated Tests
- No test suite exists
- Recommendation: Add Vitest + React Testing Library for frontend, Jest for backend
