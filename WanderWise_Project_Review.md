# CurioCity — Full Project Review

> **Document Version:** 1.0  
> **Date:** 2025-07-16  
> **Platform:** CurioCity v2 (curiocity_v2.html)  
> **Format:** Single-file mobile-first web app (HTML/CSS/JS)  
> **Scope:** Identify target users, analyze missing features, and provide a comprehensive task list for agent completion.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Overview](#2-platform-overview)
3. [Target Users & Personas](#3-target-users--personas)
4. [Current Feature Inventory](#4-current-feature-inventory)
5. [Missing Features Analysis](#5-missing-features-analysis)
6. [Technical Debt & Architecture Gaps](#6-technical-debt--architecture-gaps)
7. [Comprehensive Task List for Agents](#7-comprehensive-task-list-for-agents)
8. [Success Metrics & KPIs](#8-success-metrics--kpis)
9. [Roadmap Recommendations](#9-roadmap-recommendations)

---

## 1. Executive Summary

CurioCity is a **mobile-first, single-page web application** that lets users discover and create curiosity-driven walking guides for cities. It combines an interactive map (Leaflet), AI-generated content (Claude API), audio narration (Web Speech API), and a demo monetization model into a lightweight, offline-capable HTML file.

**Current State:** A polished frontend prototype with 4 seed guides, localStorage persistence, and a functional creator flow. It demonstrates strong UX and content strategy but lacks backend infrastructure, real authentication, payment processing, and social features.

**Strategic Gap:** The platform is a **frontend demo** masquerading as a product. To become a viable platform, it needs a backend, real user management, a content moderation pipeline, and a sustainable monetization engine.

---

## 2. Platform Overview

### 2.1 Core Value Proposition
> *"Curiosity-driven city exploration — hidden stories, not tourist traps."*

CurioCity differentiates from generic travel apps by:
- **Narrative depth:** Each stop is a "curiosity" with a surprising fact or hidden story (max 20 words).
- **Creator economy:** Anyone can publish a guide and monetize it (€0.99 unlock or ad-supported).
- **Audio-first:** Built-in walking audio guide with auto-advance "walking mode."
- **Cost transparency:** Detailed per-person cost breakdowns (tickets, meals, transport).

### 2.2 Current Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Vanilla HTML/CSS/JS (single file) | No framework; ~1,140 lines |
| **Maps** | Leaflet + OpenStreetMap tiles | No API key required |
| **AI** | Claude API (anthropic) | Hardcoded model; no key management |
| **Audio** | Web Speech API (browser TTS) | No server-side audio generation |
| **Storage** | localStorage | No backend; data lost on device change |
| **Styling** | CSS custom properties + media queries | Dark mode via `prefers-color-scheme` |
| **Monetization** | Demo only (toast messages) | No real payment or ad provider |

### 2.3 Screens & Navigation

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Explore   │────→│   Detail    │────→│   Profile   │────→│   Create    │
│   (Home)    │←────│  (Guide)    │←────│   (User)    │←────│  (Guide)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ↑                                              │
       └──────────────────────────────────────────────┘
```

### 2.4 Data Model (Current)

```javascript
Guide = {
  id, title, city, cat, creator, ci, cc, verified,
  time, dist, price, rating, desc, mc,
  costs: { tickets[], meals[], transport[], note },
  nearby[], resources[],
  stops: [{ name, desc, lat, lng, photo, video, links }],
  by
}
```

---

## 3. Target Users & Personas

### 3.1 Primary User Segments

| Segment | % of Target | Motivation | Pain Point | Device |
|---------|-------------|------------|------------|--------|
 **Curious Travellers** | 40% | Discover hidden gems beyond tourist traps | Overwhelmed by generic guidebooks | Mobile |
| **Budget Backpackers** | 25% | Free or low-cost walking experiences | Expensive tour guides and apps | Mobile |
| **Local Explorers** | 20% | Rediscover their own city | Lack of curated local narratives | Mobile |
| **Content Creators** | 10% | Monetize local knowledge | No easy platform to publish & earn | Mobile/Desktop |
| **Cultural Tourists** | 5% | Deep historical/art context | Shallow info in mainstream apps | Mobile |

### 3.2 Detailed Personas

---

#### Persona 1: "Marco — The Curious Traveller"
> **Demographics:** 28, Italian, digital nomad, €2,500/month budget  
> **Behaviors:** Plans trips 2-3 days in advance, walks 15+ km/day, avoids TripAdvisor top-10 lists.  
> **Goals:** Find authentic stories about places; understand *why* something matters, not just *what* it is.  
> **Pain Points:**
> - Most apps list monuments; none explain the human drama behind them.
> - Audio guides cost €10-15 per museum; he wants city-wide audio for less.
> - Offline access is essential (roaming data is expensive).
> **CurioCity Fit:** High. The "curiosity" format, built-in audio, and cost transparency match his needs exactly.

---

#### Persona 2: "Sophie — The Budget Backpacker"
> **Demographics:** 22, French, interrailing Europe, €800/month budget  
> **Behaviors:** Sleeps in hostels, cooks own meals, prioritizes free activities. Books nothing in advance.  
> **Goals:** Find free walking routes; know exact costs before committing; meet other travellers.  
> **Pain Points:**
> - Hidden costs ruin her daily budget (€3 museum + €5 metro + €8 lunch = 20% of daily spend).
> - Free walking tours have aggressive tipping culture and generic routes.
> - No offline maps mean she gets lost without data.
> **CurioCity Fit:** Medium-High. The "Free" filter and cost breakdowns help, but she needs offline maps and a social/matching feature.

---

#### Persona 3: "Yuki — The Local Creator"
> **Demographics:** 34, Japanese, lives in Yanaka (Tokyo), part-time tour guide  
> **Behaviors:** Walks her neighbourhood daily, knows shop owners, researches local history as a hobby.  
> **Goals:** Earn passive income from her knowledge; build a personal brand; validate her expertise.  
> **Pain Points:**
> - No platform lets her publish a *route* with audio and monetize it easily.
> - Existing platforms (Viator, GetYourGuide) take 20-30% commission and require business registration.
> - She can't track earnings, views, or user feedback in real time.
> **CurioCity Fit:** Very High. The creator flow is simple, but she needs real payouts, analytics, and a verification system to build trust.

---

#### Persona 4: "The Retired Couple — David & Linda"
> **Demographics:** 64 & 62, British, 2 city-breaks/year, €4,000/trip budget  
> **Behaviors:** Book everything in advance, prefer structured days, need accessibility info (mobility, hearing).  
> **Goals:** Stress-free exploration with clear durations, distances, and step-by-step guidance.  
> **Pain Points:**
> - Too much walking without rest stops.
> - Small text, no audio, confusing navigation.
> - No accessibility info (stairs, cobblestones, elevator access).
> **CurioCity Fit:** Low-Medium. The app is mobile-optimized but lacks accessibility features, rest-stop recommendations, and large-text mode.

---

#### Persona 5: "The Family — The Patels"
> **Demographics:** 40, Indian-British, travelling with 2 children (ages 7 & 10), 1-2 city trips/year  
> **Behaviors:** Needs child-friendly stops, toilets, food breaks, and shorter routes (30-45 min max).  
> **Goals:** Keep children engaged; educational but fun; avoid crowded/touristy areas.  
> **Pain Points:**
> - No filter for "family-friendly" or "kid-appropriate."
> - No toilet, playground, or rest-stop markers on the map.
> - Audio narration is too slow/dry for children.
> **CurioCity Fit:** Low. The platform has no family-oriented content, filters, or features.

---

### 3.3 User Journey Map (Marco — Curious Traveller)

```
AWARENESS          CONSIDERATION         CONVERSION          RETENTION            ADVOCACY
   │                    │                    │                   │                   │
   ▼                    ▼                    ▼                   ▼                   ▼
┌────────┐        ┌────────────┐        ┌──────────┐       ┌──────────┐       ┌──────────┐
│ Sees   │        │ Browses    │        │ Saves    │       │ Uses     │       │ Creates  │
│Wander- │   →    │free guides │   →    │a guide   │   →   │audio on  │   →   │his own  │
│Wise on  │        │in Palermo  │        │to profile│       │a walk    │       │guide &  │
│TikTok   │        │            │        │          │       │          │       │shares it│
└────────┘        └────────────┘        └──────────┘       └──────────┘       └──────────┘
   │                    │                    │                   │                   │
   │                    │                    │                   │                   │
Emotion:              Emotion:              Emotion:            Emotion:            Emotion:
Curious               Skeptical             Hopeful            Delighted           Proud
   │                    │                    │                   │                   │
Touchpoint:           Touchpoint:          Touchpoint:        Touchpoint:         Touchpoint:
Social media,         App Store / web,      In-app save,       Audio guide,        Creator
word-of-mouth         search bar            cost preview       map, stops         dashboard
```

---

## 4. Current Feature Inventory

### 4.1 Implemented Features

#### Explore (Home Screen)
| Feature | Status | Quality |
|---------|--------|---------|
| Category filter chips (All, Food, Architecture, History, Art, Nature, Free) | ✅ | Good |
| Search bar (title, category, creator) | ✅ | Basic |
| Guide cards with thumbnail, title, creator, duration, distance, cost, rating | ✅ | Excellent |
| Price badges (Free / €0.99 · or watch ad) | ✅ | Demo only |
| "Yours" badge for creator-owned guides | ✅ | Good |
| Real-time guide count in status bar | ✅ | Good |

#### Guide Detail Screen
| Feature | Status | Quality |
|---------|--------|---------|
| Interactive Leaflet map with route polyline | ✅ | Excellent |
| Numbered stop markers with popups | ✅ | Good |
| Nearby attractions panel | ✅ | Good |
| Audio bar with play/pause, prev/next, progress | ✅ | Good |
| Walking mode (auto-advance) | ✅ | Innovative |
| Stop-by-stop descriptions with photos, videos, links | ✅ | Excellent |
| Cost breakdown card (tickets, meals, transport, total) | ✅ | Excellent |
| Additional resources section | ✅ | Good |
| Paywall for premium guides (2-stop preview) | ✅ | Demo only |
| Save/unsave bookmark | ✅ | Good |

#### Profile Screen
| Feature | Status | Quality |
|---------|--------|---------|
| User stats (Created, Saved, Earned, Rating) | ✅ | Basic |
| Saved guides tab | ✅ | Good |
| Created guides tab with delete | ✅ | Good |
| "Create new guide" CTA | ✅ | Good |

#### Create Guide Screen
| Feature | Status | Quality |
|---------|--------|---------|
| Title, city, category, teaser description inputs | ✅ | Good |
| Stop list with add/remove/reorder | ✅ | Basic (no reorder) |
| AI-generated curiosity descriptions (Claude API) | ✅ | Excellent |
| Photo/YouTube URL per stop | ✅ | Good |
| Duration, distance, cost inputs | ✅ | Good |
| Access model selector (Free / €0.99 / Watch ad) | ✅ | Demo only |
| Draft auto-save | ✅ | Good |
| Publish with validation | ✅ | Good |

#### Technical / UX
| Feature | Status | Quality |
|---------|--------|---------|
| Dark mode (prefers-color-scheme) | ✅ | Good |
| Mobile-first responsive design | ✅ | Excellent |
| Loading spinner | ✅ | Good |
| Toast notifications | ✅ | Good |
| Screen navigation with history stack | ✅ | Good |
| localStorage persistence | ✅ | Fragile |

### 4.2 Feature Completeness Matrix

| Capability | Frontend | Backend | Integration | Overall |
|------------|----------|---------|-------------|---------|
| Guide browsing | 90% | 0% | 0% | **30%** |
| Guide creation | 80% | 0% | 20% | **33%** |
| Audio experience | 85% | 0% | 0% | **28%** |
| Maps & navigation | 75% | 0% | 0% | **25%** |
| Monetization | 20% | 0% | 0% | **7%** |
| User management | 10% | 0% | 0% | **3%** |
| Social features | 5% | 0% | 0% | **2%** |
| Analytics | 0% | 0% | 0% | **0%** |
| Content moderation | 0% | 0% | 0% | **0%** |

---

## 5. Missing Features Analysis

### 5.1 Critical — Platform Cannot Launch Without These

| # | Missing Feature | Impact | Why Critical |
|---|----------------|--------|--------------|
| C1 | **Backend Database** | Users lose all data when switching devices or clearing browser data. No multi-device sync. | localStorage is not a production database. |
| C2 | **User Authentication** | No user accounts, no password recovery, no identity verification. Creators cannot build a reputation. | The "verified" badge is hardcoded. |
| C3 | **Real Payment Processing** | The "€0.99 unlock" and "watch ad" are toast messages with no actual transaction. | Creators cannot earn. Platform cannot generate revenue. |
| C4 | **Content Moderation** | Anyone can publish anything. No review, no reporting, no spam detection. | Risk of abuse, scams, or inappropriate content. |
| C5 | **Image Upload & Hosting** | Users must paste image URLs. No upload, no resizing, no CDN. | Friction for creators; broken images when URLs die. |
| C6 | **Geocoding for Stops** | User-created stops have `lat: null, lng: null`. No map route for creator guides. | Core value proposition (map + route) is broken for UGC. |
| C7 | **Offline Support / PWA** | No service worker, no cache, no offline map tiles. | Travellers need offline access; roaming is expensive. |

### 5.2 High Priority — Significantly Impacts User Experience

| # | Missing Feature | Impact | Affected Personas |
|---|----------------|--------|-------------------|
| H1 | **User Onboarding & Tutorial** | First-time users don't understand the audio feature, paywall, or creator flow. | All |
| H2 | **Push Notifications** | No reminder to continue a saved guide, no "new guide in your city" alerts. | All |
| H3 | **Search by Location / "Near Me"** | Cannot find guides near current GPS position. | Marco, Sophie |
| H4 | **Reviews & Ratings** | Guides show a hardcoded 5.0 rating. No user feedback, no quality signal. | All |
| H5 | **Sharing (Deep Links)** | Cannot share a specific guide via URL or social media. | All |
| H6 | **Creator Analytics Dashboard** | Creators see "€0.00 earned" with no views, downloads, or conversion data. | Yuki |
| H7 | **Favourites / Wishlists** | Only "Saved" exists; no "Want to visit" or itinerary planning. | All |
| H8 | **Multi-language Support** | Only English. No i18n framework. | Non-English speakers |
| H9 | **Accessibility (a11y)** | No ARIA labels, no keyboard navigation, no screen reader support, no large-text mode. | David & Linda |
| H10 | **Real Ad Provider Integration** | "Watch ad to unlock" is a demo. Needs Google AdMob, Unity Ads, or similar. | Sophie |
| H11 | **Email / Social Login** | No OAuth (Google, Apple, Facebook). No email/password. | All |
| H12 | **Password Reset & Account Recovery** | No email flow, no support contact. | All |

### 5.3 Medium Priority — Competitive Differentiation

| # | Missing Feature | Impact | Affected Personas |
|---|----------------|--------|-------------------|
| M1 | **Itinerary Builder** | Users cannot combine multiple guides into a day plan. | Marco, Families |
| M2 | **Social Following** | Cannot follow creators, get a feed of new guides from favourites. | All |
| M3 | **Comments / Q&A on Guides** | No community discussion around stops or tips. | All |
| M4 | **Live Events / Group Walks** | No scheduled group walks with a host. | Sophie |
| M5 | **Badges & Gamification** | No rewards for walking distance, guides completed, or streaks. | All |
| M6 | **Custom Audio Upload** | Creators can only use TTS; cannot upload their own narration. | Yuki |
| M7 | **AR / Camera Overlays** | No augmented reality waypoints or historical photo overlays. | Marco |
| M8 | **Weather Integration** | No "rain-friendly route" or "best at sunset" suggestions. | All |
| M9 | **Public Transport Integration** | Only basic transport cost; no real-time transit data. | Sophie |
| M10 | **Emergency SOS / Safety** | No "share my location" or emergency contact feature. | Solo travellers |
| M11 | **Family / Kid Mode** | No child-friendly narration, shorter routes, or playground filters. | Patels |
| M12 | **Rest Stop & Amenity Markers** | No toilets, cafes, benches, or shaded spots on the map. | David & Linda, Patels |
| M13 | **Dark Mode Toggle** | Only system-level dark mode; no in-app switch. | All |
| M14 | **Guide Collections / Themes** | No curated lists (e.g., "Rainy Day Palermo," "Best for Photographers"). | All |
| M15 | **Export / Print Guide** | Cannot export to PDF or print for offline use. | David & Linda |

### 5.4 Low Priority — Nice to Have

| # | Missing Feature | Impact |
|---|----------------|--------|
| L1 | **AI Route Optimizer** | Auto-reorder stops for shortest walking distance. |
| L2 | **Voice Search** | Search by speaking instead of typing. |
| L3 | **Integration with Booking.com / Hotels** | Suggest hotels near guide start points. |
| L4 | **Affiliate Links** | Earn commission on ticket/museum bookings through guide links. |
| L5 | **White-label / B2B** | Let hotels or tourism boards create branded guides. |
| L6 | **AI Translation of Guides** | Auto-translate guide content to other languages. |
| L7 | **Blockchain / NFT Certificates** | Proof of completion as a collectible (gimmicky). |
| L8 | **3D Map / Satellite View** | Beyond OpenStreetMap standard tiles. |

---

## 6. Technical Debt & Architecture Gaps

### 6.1 Current Architecture

```
┌─────────────────────────────────────────────┐
│              Client (Browser)                 │
│  ┌─────────────┐  ┌─────────────┐             │
│  │  HTML/CSS   │  │  Vanilla JS │             │
│  │  (UI Layer) │  │ (App Logic) │             │
│  └─────────────┘  └──────┬──────┘             │
│                          │                    │
│           ┌──────────────┼──────────────┐      │
│           ▼              ▼              ▼      │
│      ┌────────┐    ┌─────────┐    ┌────────┐ │
│      │local   │    │ Claude  │    │Leaflet │ │
│      │Storage │    │  API    │    │  OSM   │ │
│      └────────┘    └─────────┘    └────────┘ │
└─────────────────────────────────────────────┘
                     │
                     ▼
              ┌─────────────┐
              │   No Backend  │
              │   No Server   │
              │   No Database │
              └─────────────┘
```

### 6.2 Technical Debt Register

| ID | Issue | Severity | Effort | Risk |
|----|-------|----------|--------|------|
| TD-01 | **Single-file architecture** — All HTML, CSS, JS in one file. Unmaintainable at scale. | High | Medium | Blocks team growth |
| TD-02 | **Hardcoded API key** — Claude API key is exposed in client-side JS. | Critical | Low | Security breach |
| TD-03 | **No error boundaries** — Any JS error crashes the app state. | High | Medium | Bad UX |
| TD-04 | **No input sanitization** — XSS possible via guide title, description, or links. | Critical | Low | Security breach |
| TD-05 | **No CSRF protection** — Even if a backend existed, no token mechanism. | Medium | Low | Security |
| TD-06 | **No rate limiting** — Users can spam AI generation or guide creation. | Medium | Low | Abuse / Cost |
| TD-07 | **localStorage size limit** — ~5MB max. Will break with photos or many guides. | High | Low | Data loss |
| TD-08 | **No versioning** — localStorage schema changes will corrupt existing data. | Medium | Low | Data loss |
| TD-09 | **No testing framework** — No unit tests, no E2E tests, no CI/CD. | Medium | High | Regression bugs |
| TD-10 | **No build process** — No bundler, no minification, no tree-shaking, no TypeScript. | Medium | Medium | Performance |
| TD-11 | **No SEO** — Single-page app with no SSR, no meta tags, no Open Graph. | Medium | Medium | Discovery |
| TD-12 | **No analytics** — No Google Analytics, no Mixpanel, no event tracking. | Medium | Low | Blind product decisions |
| TD-13 | **No error logging** — No Sentry, no LogRocket. Errors happen silently. | Medium | Low | Debugging hell |
| TD-14 | **No CDN** — Assets loaded from Wikimedia, picsum.photos, YouTube. Unreliable. | Medium | Medium | Broken images |
| TD-15 | **No TypeScript** — No type safety, no IntelliSense, refactor-prone. | Low | Medium | Developer velocity |

### 6.3 Recommended Architecture (Target)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────────────┐
│   Mobile    │     │   Desktop   │     │           CDN (CloudFront)          │
│   (React    │     │   (React    │     │  ┌─────────┐  ┌─────────┐            │
│   Native)   │     │   Web App)  │     │  │ Images  │  │ Audio   │            │
└──────┬──────┘     └──────┬──────┘     │  │  (S3)   │  │  (S3)   │            │
       │                   │            └─────────┘  └─────────┘            │
       └─────────┬─────────┘                                              │
                 │                                                        │
                 ▼                                                        │
        ┌─────────────────┐                                               │
        │   API Gateway     │◄────────────────────────────────────────────┘
        │   (AWS / Vercel)  │
        └────────┬──────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Auth Service │  │  Guide API    │  │ Payment API   │  │  AI Service   │
│  (Firebase/   │  │  (Node/Python)│  │  (Stripe/     │  │  (Claude/     │
│   Auth0)      │  │               │  │  AdMob)       │  │   OpenAI)     │
└───────────────┘  └───────┬───────┘  └───────────────┘  └───────────────┘
                           │
                    ┌──────┴──────┐
                    │ PostgreSQL  │
                    │ (Guides,    │
                    │ Users,      │
                    │ Reviews)    │
                    └─────────────┘
                    │ Redis       │
                    │ (Cache,     │
                    │ Sessions)   │
                    └─────────────┘
                    │ Elasticsearch│
                    │ (Search)     │
                    └─────────────┘
```

---

## 7. Comprehensive Task List for Agents

This section is organized by **priority**, **domain**, and **agent role**. Each task includes: **ID**, **Title**, **Description**, **Acceptance Criteria**, **Estimated Effort**, and **Assigned Agent Role**.

### Phase 1: Foundation (Weeks 1–4) — Critical Path

> **Goal:** Make the platform production-ready. No launch without these.

---

#### F1. Backend & Database Setup
| Field | Details |
|-------|---------|
| **ID** | BE-001 |
| **Title** | Design & deploy PostgreSQL schema |
| **Description** | Create relational database schema for users, guides, stops, reviews, payments, and analytics. Deploy on Supabase or AWS RDS. |
| **Acceptance Criteria** | 1. Schema supports all current guide fields + user accounts + reviews + payment records. 2. Migration scripts are versioned. 3. Seed data reproduces the 4 current demo guides. 4. ER diagram is documented. |
| **Effort** | 3 days |
| **Agent** | Backend Agent |

| Field | Details |
|-------|---------|
| **ID** | BE-002 |
| **Title** | Build REST API (Node.js + Express / Python + FastAPI) |
| **Description** | Create CRUD endpoints for guides, users, auth, and reviews. Implement JWT authentication, request validation, and error handling. |
| **Acceptance Criteria** | 1. `/api/guides` (GET, POST, PATCH, DELETE). 2. `/api/auth` (register, login, refresh, logout). 3. `/api/users/{id}` (GET, PATCH). 4. `/api/reviews` (GET, POST). 5. All endpoints return consistent JSON with error codes. 6. Swagger/OpenAPI docs auto-generated. |
| **Effort** | 5 days |
| **Agent** | Backend Agent |

| Field | Details |
|-------|---------|
| **ID** | BE-003 |
| **Title** | Implement secure AI proxy endpoint |
| **Description** | Create a server-side endpoint that forwards curiosity-generation requests to Claude API, hiding the API key from clients. Add rate limiting (10 requests/hour per user). |
| **Acceptance Criteria** | 1. `POST /api/ai/generate-descriptions` accepts stop names + city + category. 2. Returns JSON with descriptions. 3. API key is server-side only. 4. Rate limit enforced (429 returned on exceed). 5. Cost logging per request. |
| **Effort** | 2 days |
| **Agent** | Backend Agent |

| Field | Details |
|-------|---------|
| **ID** | BE-004 |
| **Title** | Implement image upload & storage |
| **Description** | Build presigned S3 URL generation for direct browser upload. Implement image resizing (thumbnail, medium, full). Add content-type validation. |
| **Acceptance Criteria** | 1. `POST /api/upload/presign` returns a temporary URL. 2. Images are resized to 480x240, 800x400, and 1600x800. 3. Only image/jpeg and image/png accepted. 4. Max file size 10MB. 5. CDN delivery URL returned. |
| **Effort** | 2 days |
| **Agent** | Backend Agent |

| Field | Details |
|-------|---------|
| **ID** | BE-005 |
| **Title** | Implement geocoding service |
| **Description** | Integrate Nominatim (OpenStreetMap) or Google Geocoding API to convert stop addresses into lat/lng. Cache results in Redis. |
| **Acceptance Criteria** | 1. `POST /api/geocode` accepts a stop name + city and returns lat/lng. 2. Results cached for 30 days. 3. Fallback to city center if geocoding fails. 4. Rate limit 100 requests/minute. |
| **Effort** | 2 days |
| **Agent** | Backend Agent |

---

#### F2. Authentication & User Management

| Field | Details |
|-------|---------|
| **ID** | AUTH-001 |
| **Title** | Implement OAuth 2.0 login (Google, Apple) |
| **Description** | Add social login using Firebase Auth or Auth0. Support Google and Apple Sign-In. Generate JWT tokens. |
| **Acceptance Criteria** | 1. Users can log in with Google or Apple. 2. JWT tokens expire in 7 days with refresh token. 3. User profile auto-created on first login. 4. Existing anonymous users can "upgrade" to full account while preserving data. |
| **Effort** | 3 days |
| **Agent** | Auth Agent |

| Field | Details |
|-------|---------|
| **ID** | AUTH-002 |
| **Title** | Implement email/password authentication |
| **Description** | Add traditional email registration with password hashing (bcrypt). Include email verification and password reset flow. |
| **Acceptance Criteria** | 1. `POST /api/auth/register` with email + password. 2. Verification email sent via SendGrid/AWS SES. 3. `POST /api/auth/forgot-password` sends reset link. 4. Passwords hashed with bcrypt (cost factor 12). 5. Rate limit on login attempts (5 per 15 min). |
| **Effort** | 3 days |
| **Agent** | Auth Agent |

| Field | Details |
|-------|---------|
| **ID** | AUTH-003 |
| **Title** | Build user profile system |
| **Description** | Extend user model with avatar, bio, location, verification status, and social links. Build profile edit UI. |
| **Acceptance Criteria** | 1. Users can upload avatar (crop to 1:1). 2. Bio field (max 300 chars). 3. Location field (city). 4. Verification badge logic (manual admin + automated criteria). 5. Public profile page at `/u/{username}`. |
| **Effort** | 2 days |
| **Agent** | Auth Agent + Frontend Agent |

---

#### F3. Payment & Monetization

| Field | Details |
|-------|---------|
| **ID** | PAY-001 |
| **Title** | Integrate Stripe for guide unlocks |
| **Description** | Implement Stripe Checkout for €0.99 guide purchases. Store purchase records. Handle webhooks for confirmation. |
| **Acceptance Criteria** | 1. `POST /api/payments/create-checkout-session` returns Stripe URL. 2. Webhook `checkout.session.completed` unlocks guide for user. 3. Purchase record stored in DB. 4. Failed payments handled gracefully. 5. Test mode fully functional. |
| **Effort** | 3 days |
| **Agent** | Payments Agent |

| Field | Details |
|-------|---------|
| **ID** | PAY-002 |
| **Title** | Implement creator payout system |
| **Description** | Build dashboard showing earnings per guide. Implement Stripe Connect for creator payouts (70% to creator, 30% platform). |
| **Acceptance Criteria** | 1. Creator dashboard shows total earnings, per-guide earnings, and payout history. 2. Stripe Connect onboarding for creators. 3. Payouts triggered automatically at €50 threshold. 4. Platform fee (30%) deducted and logged. |
| **Effort** | 4 days |
| **Agent** | Payments Agent |

| Field | Details |
|-------|---------|
| **ID** | PAY-003 |
| **Title** | Integrate rewarded video ads (AdMob / Unity) |
| **Description** | Replace demo "watch ad" button with real rewarded video ad flow. Unlock guide on ad completion. |
| **Acceptance Criteria** | 1. Ad loads from Google AdMob or Unity Ads. 2. Guide unlocks only after `onAdRewarded` callback. 3. Ad fails gracefully (fallback to payment option). 4. Mobile and web support. 5. Revenue tracked per ad view. |
| **Effort** | 3 days |
| **Agent** | Payments Agent |

---

#### F4. Content Moderation

| Field | Details |
|-------|---------|
| **ID** | MOD-001 |
| **Title** | Build automated content moderation pipeline |
| **Description** | Use AWS Comprehend, Perspective API, or a custom classifier to auto-flag inappropriate guide content (spam, hate, adult). |
| **Acceptance Criteria** | 1. All new guides scanned before publication. 2. Auto-flag if confidence > 0.8. 3. Flagged guides hidden pending review. 4. Admin notification on flag. 5. False-positive appeal mechanism. |
| **Effort** | 3 days |
| **Agent** | ML / Safety Agent |

| Field | Details |
|-------|---------|
| **ID** | MOD-002 |
| **Title** | Implement user reporting system |
| **Description** | Add "Report" button on guides and profiles. Build admin review queue with approve/reject actions. |
| **Acceptance Criteria** | 1. Report button on every guide (reasons: spam, inaccurate, inappropriate, copyright). 2. Report stored in DB with reporter ID. 3. Admin dashboard at `/admin/reports` with sort/filter. 4. Admin can hide guide, warn user, or ban account. 5. Reporter notified of outcome. |
| **Effort** | 2 days |
| **Agent** | Backend Agent |

---

### Phase 2: Core Experience (Weeks 5–8)

> **Goal:** Make the app delightful, shareable, and discoverable.

---

#### F5. Frontend Modernization

| Field | Details |
|-------|---------|
| **ID** | FE-001 |
| **Title** | Migrate to React + TypeScript SPA |
| **Description** | Rebuild the single-file app into a modular React application with TypeScript. Use Vite for bundling. |
| **Acceptance Criteria** | 1. All 4 screens (Home, Detail, Profile, Create) ported. 2. Component library with Storybook. 3. TypeScript strict mode. 4. All existing features preserved. 5. Bundle size < 500KB initial. |
| **Effort** | 7 days |
| **Agent** | Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | FE-002 |
| **Title** | Implement PWA with offline support |
| **Description** | Add service worker, app manifest, and cache strategies. Cache guide data, map tiles, and audio for offline use. |
| **Acceptance Criteria** | 1. `manifest.json` with icons, theme, display mode. 2. Service worker caches API responses and map tiles. 3. "Add to Home Screen" prompt on mobile. 4. Saved guides available offline. 5. Audio guide works offline (cached TTS or pre-generated audio). |
| **Effort** | 4 days |
| **Agent** | Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | FE-003 |
| **Title** | Implement deep linking & social sharing |
| **Description** | Enable URL-based routing (`/guide/{id}`) and Open Graph meta tags. Add native share sheet on mobile. |
| **Acceptance Criteria** | 1. `/guide/{id}` loads the guide detail screen directly. 2. Open Graph tags include title, description, image. 3. Twitter Cards supported. 4. Native Web Share API used on mobile. 5. QR code generation per guide. |
| **Effort** | 2 days |
| **Agent** | Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | FE-004 |
| **Title** | Build onboarding flow |
| **Description** | Create 3-step onboarding for first-time users: 1) Value prop, 2) Location permission, 3) Interest selection. |
| **Acceptance Criteria** | 1. Onboarding shown only on first visit. 2. Can be skipped. 3. Location permission requested with context. 4. Category preferences stored and used for feed ranking. 5. Progress indicator. |
| **Effort** | 2 days |
| **Agent** | UX Agent + Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | FE-005 |
| **Title** | Implement accessibility (WCAG 2.1 AA) |
| **Description** | Add ARIA labels, keyboard navigation, focus trapping, screen reader announcements, and large-text mode. |
| **Acceptance Criteria** | 1. All interactive elements have ARIA labels. 2. Full keyboard navigation (Tab, Enter, Escape). 3. Screen reader announces route changes. 4. Passes axe-core audit with 0 critical errors. 5. Font size slider (100%–200%). |
| **Effort** | 3 days |
| **Agent** | A11y Agent + Frontend Agent |

---

#### F6. Maps & Location

| Field | Details |
|-------|---------|
| **ID** | MAP-001 |
| **Title** | Implement "Guides Near Me" |
| **Description** | Use browser geolocation API to find guides within X km of user. Sort by distance. |
| **Acceptance Criteria** | 1. GPS permission requested with explanation. 2. Fallback to city search if denied. 3. Distance calculated using Haversine formula. 4. Results sorted by proximity. 5. Refresh button for location update. |
| **Effort** | 2 days |
| **Agent** | Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | MAP-002 |
| **Title** | Add amenity markers to map |
| **Description** | Display toilets, cafes, benches, and public transport stops near the route using Overpass API or POI database. |
| **Acceptance Criteria** | 1. Toggle to show/hide amenities. 2. Icons for toilet, cafe, bench, metro. 3. Filter by amenity type. 4. Tapping amenity shows name and distance. 5. Updated when route changes. |
| **Effort** | 2 days |
| **Agent** | Frontend Agent |

---

#### F7. Social & Reviews

| Field | Details |
|-------|---------|
| **ID** | SOC-001 |
| **Title** | Build review & rating system |
| **Description** | Allow users to rate (1-5 stars) and review guides. Display average rating and review count. |
| **Acceptance Criteria** | 1. Review form on guide detail (rating + text + optional photo). 2. Reviews shown chronologically with sort options. 3. Average rating updated in real-time. 4. Creator can respond to reviews. 5. Flag inappropriate reviews. |
| **Effort** | 3 days |
| **Agent** | Backend Agent + Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | SOC-002 |
| **Title** | Implement following & feed |
| **Description** | Let users follow creators. Build a "Following" tab on Home showing new guides from followed creators. |
| **Acceptance Criteria** | 1. Follow/unfollow button on creator profiles. 2. "Following" tab on Home screen. 3. Push notification on new guide from followed creator. 4. Follower count on profile. 5. No follower limit for MVP. |
| **Effort** | 3 days |
| **Agent** | Backend Agent + Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | SOC-003 |
| **Title** | Add comments on guides |
| **Description** | Enable threaded comments on guide detail. Support @mentions and basic markdown. |
| **Acceptance Criteria** | 1. Comment form below guide content. 2. Threaded replies (1 level deep). 3. @mention triggers notification. 4. Real-time comment updates (WebSocket or polling). 5. Moderation: report, delete own. |
| **Effort** | 3 days |
| **Agent** | Backend Agent + Frontend Agent |

---

### Phase 3: Growth & Optimization (Weeks 9–12)

> **Goal:** Scale the platform, improve retention, and optimize revenue.

---

#### F8. Analytics & Monitoring

| Field | Details |
|-------|---------|
| **ID** | ANA-001 |
| **Title** | Integrate product analytics (Mixpanel / Amplitude) |
| **Description** | Track key events: guide_view, guide_save, guide_purchase, audio_play, creator_publish, search_query. |
| **Acceptance Criteria** | 1. All key events tracked with properties. 2. Funnel analysis for purchase conversion. 3. Cohort retention by signup week. 4. Event volume < 100KB/user/month. 5. GDPR-compliant (no PII in events). |
| **Effort** | 2 days |
| **Agent** | Analytics Agent |

| Field | Details |
|-------|---------|
| **ID** | ANA-002 |
| **Title** | Implement error tracking & logging |
| **Description** | Integrate Sentry for frontend errors and Winston/Pino for backend logging. Set up alerting. |
| **Acceptance Criteria** | 1. All unhandled JS errors captured in Sentry. 2. Backend logs structured JSON. 3. Alert on > 10 errors/hour or 500 status rate > 1%. 4. Source maps uploaded for release builds. 5. PII redacted from logs. |
| **Effort** | 2 days |
| **Agent** | DevOps Agent |

| Field | Details |
|-------|---------|
| **ID** | ANA-003 |
| **Title** | Build creator analytics dashboard |
| **Description** | Show creators: views, unique viewers, saves, purchases, conversion rate, revenue, and top-performing stops. |
| **Acceptance Criteria** | 1. Time-series charts (daily/weekly/monthly). 2. Per-guide and aggregate metrics. 3. Conversion funnel: view → save → purchase. 4. Export to CSV. 5. Email summary weekly. |
| **Effort** | 3 days |
| **Agent** | Analytics Agent + Frontend Agent |

---

#### F9. Growth & Marketing

| Field | Details |
|-------|---------|
| **ID** | GRW-001 |
| **Title** | Implement push notifications |
| **Description** | Use Firebase Cloud Messaging for web push. Notifications for: new guide from followed creator, saved guide reminder, weekly digest. |
| **Acceptance Criteria** | 1. Permission prompt with value prop. 2. Notification types: instant, scheduled, triggered. 3. Click navigates to relevant screen. 4. Unsubscribe per category. 5. Delivery rate > 95%. |
| **Effort** | 3 days |
| **Agent** | Growth Agent |

| Field | Details |
|-------|---------|
| **ID** | GRW-002 |
| **Title** | Build SEO & content marketing pages |
| **Description** | Create static landing pages per city and category with SSR. Optimize for keywords like "walking guide Palermo," "free Tokyo tour." |
| **Acceptance Criteria** | 1. `/city/{slug}` and `/category/{slug}` pages with SSR. 2. Title, H1, meta description optimized. 3. Structured data (Schema.org) for guides. 4. Sitemap generated dynamically. 5. Core Web Vitals: LCP < 2.5s, CLS < 0.1. |
| **Effort** | 4 days |
| **Agent** | SEO Agent + Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | GRW-003 |
| **Title** | Implement referral program |
| **Description** | Users get a unique referral code. Referred users get €0.50 credit. Referrer gets €0.50 on first purchase. |
| **Acceptance Criteria** | 1. Unique code generated per user. 2. Code input at checkout. 3. Credit applied to wallet. 4. Referral tracking in DB. 5. Fraud detection (same device, VPN, etc.). |
| **Effort** | 3 days |
| **Agent** | Growth Agent + Backend Agent |

---

#### F10. Internationalization

| Field | Details |
|-------|---------|
| **ID** | I18N-001 |
| **Title** | Implement i18n framework (English, Italian, Spanish, Japanese) |
| **Description** | Use i18next or react-intl. Extract all strings. Provide translations for UI, error messages, and onboarding. |
| **Acceptance Criteria** | 1. Language switcher in settings. 2. All UI strings externalized. 3. RTL support considered. 4. Date/number/currency formatting localized. 5. AI-generated descriptions can be translated on request. |
| **Effort** | 4 days |
| **Agent** | Localization Agent + Frontend Agent |

---

### Phase 4: Advanced Features (Weeks 13–16)

> **Goal:** Differentiate from competitors and maximize LTV.

---

#### F11. Advanced Creator Tools

| Field | Details |
|-------|---------|
| **ID** | CRT-001 |
| **Title** | Build itinerary builder for users |
| **Description** | Let users combine multiple guides into a day plan with time slots, travel time between guides, and total cost. |
| **Acceptance Criteria** | 1. "Add to itinerary" button on guides. 2. Drag-and-drop reorder. 3. Auto-calculate travel time (walking + transit). 4. Total cost summary. 5. Share itinerary as link or PDF. |
| **Effort** | 5 days |
| **Agent** | Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | CRT-002 |
| **Title** | Enable custom audio upload for creators |
| **Description** | Allow creators to upload MP3/WAV narration instead of relying on TTS. Host on S3 + CloudFront. |
| **Acceptance Criteria** | 1. Upload per stop or per guide. 2. Max file size 50MB per guide. 3. Transcoding to MP3 128kbps. 4. Audio player with waveform visualization. 5. Fallback to TTS if no custom audio. |
| **Effort** | 4 days |
| **Agent** | Backend Agent + Frontend Agent |

| Field | Details |
|-------|---------|
| **ID** | CRT-003 |
| **Title** | AI route optimizer |
| **Description** | Auto-reorder stops to minimize walking distance and avoid backtracking. Use OR-Tools or a simple greedy algorithm. |
| **Acceptance Criteria** | 1. "Optimize route" button in create flow. 2. Preserves start/end if specified. 3. Shows before/after distance comparison. 4. Can undo. 5. Works with 3–20 stops. |
| **Effort** | 3 days |
| **Agent** | ML Agent + Backend Agent |

---

#### F12. Premium Features

| Field | Details |
|-------|---------|
| **ID** | PRM-001 |
| **Title** | Launch CurioCity Plus subscription |
| **Description** | Monthly subscription (€4.99/month) for: unlimited guide access, offline maps, custom audio, no ads, creator analytics. |
| **Acceptance Criteria** | 1. Stripe subscription checkout. 2. Subscription status checked on every guide unlock. 3. Graceful downgrade on cancellation. 4. Apple/Google IAP for mobile apps. 5. Family plan (up to 5 profiles). |
| **Effort** | 5 days |
| **Agent** | Payments Agent + Backend Agent |

| Field | Details |
|-------|---------|
| **ID** | PRM-002 |
| **Title** | Implement AI translation of guides |
| **Description** | Use Claude API to translate guide content (title, descriptions, stops) into target languages on demand. |
| **Acceptance Criteria** | 1. "Translate" button on guide detail. 2. Supported languages: EN, IT, ES, FR, DE, JA, KO, ZH. 3. Translation cached per guide-language pair. 4. Original text shown on toggle. 5. Cost tracked per translation. |
| **Effort** | 3 days |
| **Agent** | ML Agent + Backend Agent |

---

### Summary: All Tasks by Agent Role

| Agent Role | Task Count | Total Effort (days) | Focus Areas |
|------------|-----------:|--------------------:|-------------|
| **Backend Agent** | 8 | 24 | API, DB, auth, payments, geocoding, uploads |
| **Frontend Agent** | 10 | 32 | React migration, PWA, maps, UI, accessibility |
| **Auth Agent** | 3 | 8 | OAuth, email auth, profiles |
| **Payments Agent** | 3 | 10 | Stripe, payouts, ads |
| **ML / Safety Agent** | 2 | 6 | Content moderation, AI optimization |
| **Analytics Agent** | 2 | 5 | Product analytics, creator dashboards |
| **DevOps Agent** | 1 | 2 | Logging, monitoring, alerting |
| **Growth Agent** | 2 | 7 | Push notifications, SEO, referrals |
| **UX Agent** | 1 | 2 | Onboarding flow |
| **A11y Agent** | 1 | 3 | WCAG 2.1 AA compliance |
| **SEO Agent** | 1 | 4 | Landing pages, structured data |
| **Localization Agent** | 1 | 4 | i18n, translations |
| **Mobile Agent** | 0 | 0 | *React Native / Flutter app (future phase)* |
| **TOTAL** | **35** | **107 days (~5 months)** | |

> **Note:** Effort estimates assume 1 agent = 1 senior engineer. Parallel workstreams (backend + frontend) can reduce calendar time to ~10–12 weeks.

---

## 8. Success Metrics & KPIs

### 8.1 North Star Metric
> **"Guides Completed"** — A user opens a guide, listens to audio for > 2 stops, and spends > 10 minutes on the detail screen.

### 8.2 KPI Tree

```
                    ┌─────────────────────────┐
                    │   Monthly Active Users  │
                    │         (MAU)             │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌───────────────┐
│  Acquisition  │     │    Retention    │     │  Monetization │
│               │     │                 │     │               │
│ • New signups │     │ • D1/D7/D30     │     │ • ARPU        │
│ • Organic %   │     │   retention     │     │ • LTV         │
│ • K-factor    │     │ • Churn rate    │     │ • Conversion  │
│ • CAC         │     │ • Avg sessions  │     │   rate        │
│               │     │   per user      │     │ • Creator     │
│               │     │                 │     │   earnings    │
└───────────────┘     └─────────────────┘     └───────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌─────────────────┐     ┌───────────────┐
│  Activation   │     │    Engagement   │     │   Expansion   │
│               │     │                 │     │               │
│ • Guides      │     │ • Avg time      │     │ • Plus subs   │
│   viewed      │     │   in app        │     │ • Referral    │
│ • Audio       │     │ • Stops         │     │   rate        │
│   plays       │     │   completed     │     │ • Upsell      │
│ • Saves       │     │ • Shares        │     │   rate        │
│   per user    │     │ • Reviews       │     │               │
│               │     │   written       │     │               │
└───────────────┘     └─────────────────┘     └───────────────┘
```

### 8.3 Target Metrics (6 Months Post-Launch)

| Metric | Target | Definition |
|--------|--------|------------|
| MAU | 50,000 | Unique users who open a guide |
| D1 Retention | 35% | Return within 24 hours of signup |
| D30 Retention | 12% | Return within 30 days of signup |
| Guides Created | 5,000 | User-published guides |
| Guide Completion Rate | 25% | Users who view > 2 stops of a guide |
| Purchase Conversion | 4% | Free users who buy a guide |
| Creator Earnings | €15,000 | Total paid out to creators |
| NPS | 45+ | "How likely are you to recommend?" |
| App Store Rating | 4.5+ | iOS/Android store rating |
| Support Tickets | < 2% | Of MAU, per month |

---

## 9. Roadmap Recommendations

### 9.1 Suggested Phasing

```
Month 1–2:   FOUNDATION
             ├── Backend API + PostgreSQL
             ├── Auth (OAuth + email)
             ├── Image upload + geocoding
             └── Security audit (XSS, CSRF, rate limiting)

Month 3–4:   CORE EXPERIENCE
             ├── React + TypeScript migration
             ├── PWA + offline support
             ├── Payment integration (Stripe + AdMob)
             ├── Reviews + social following
             └── Onboarding + accessibility

Month 5–6:   GROWTH
             ├── SEO landing pages
             ├── Push notifications
             ├── Analytics + creator dashboard
             ├── Referral program
             └── i18n (4 languages)

Month 7–8:   ADVANCED
             ├── Itinerary builder
             ├── Custom audio upload
             ├── AI route optimizer
             ├── CurioCity Plus subscription
             └── AI translation

Month 9–12:  SCALE
             ├── React Native app (iOS/Android)
             ├── B2B / white-label for tourism boards
             ├── Affiliate partnerships (museums, hotels)
             ├── Community events / group walks
             └── Machine learning for personalized recommendations
```

### 9.2 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **AI costs spiral** | Medium | High | Implement aggressive caching; cap free-tier AI usage; use smaller models for simple tasks. |
| **Creator supply low** | High | High | Seed 100+ guides before launch; offer creator bonuses; simplify creation flow. |
| **Payment friction** | Medium | Medium | Offer ad-supported free tier; bundle guides; accept local payment methods. |
| **Content quality** | Medium | High | Mandatory review queue for first 3 guides; community flagging; AI pre-screen. |
| **Competitor response** | Low | Medium | Differentiate on narrative depth + creator economy; build community moat. |
| **Regulatory (GDPR)** | Medium | High | Privacy-first design; EU data residency; consent management; DPO appointment. |
| **Map tile costs** | Low | Medium | Cache aggressively; use self-hosted tiles at scale; partner with OSM. |

### 9.3 Immediate Next Steps (This Week)

1. **Create a shared project board** (GitHub Projects / Linear / Jira) with all 35 tasks above.
2. **Assign agent roles** and establish async communication channels (Slack / Discord).
3. **Set up a staging environment** (Vercel + Supabase free tier) for iterative deployment.
4. **Draft a data privacy policy** and terms of service before handling real user data.
5. **Create a design system** (Figma or similar) with the existing color palette, typography, and components to ensure frontend consistency.

---

## Appendix A: Current File Structure (As-Is)

```
C:\Users\matteo\Desktop\CurioCity\
└── curiocity_v2.html          (69 KB, single file, all code inline)
```

## Appendix B: Recommended File Structure (Target)

```
curiocity/
├── apps/
│   ├── web/                    # React + Vite SPA
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI
│   │   │   ├── screens/        # Home, Detail, Profile, Create
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # API client, utils
│   │   │   ├── stores/         # Zustand / Redux state
│   │   │   ├── styles/         # Global CSS, themes
│   │   │   └── App.tsx
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── sw.js           # Service worker
│   │   ├── index.html
│   │   └── package.json
│   └── mobile/                 # React Native (future)
│
├── packages/
│   ├── ui/                     # Shared component library
│   ├── types/                  # TypeScript definitions
│   └── config/                 # ESLint, TS, Tailwind configs
│
├── services/
│   ├── api/                    # Node.js / FastAPI backend
│   │   ├── routes/
│   │   │   ├── guides.py
│   │   │   ├── auth.py
│   │   │   ├── payments.py
│   │   │   └── ai.py
│   │   ├── models/
│   │   ├── middleware/
│   │   └── tests/
│   └── worker/                 # Background jobs (Celery / Bull)
│
├── infra/
│   ├── terraform/              # AWS / GCP infrastructure
│   ├── docker/
│   └── k8s/                  # Kubernetes manifests
│
├── docs/
│   ├── api/                    # OpenAPI specs
│   ├── adr/                    # Architecture Decision Records
│   └── runbooks/               # Operational playbooks
│
└── README.md
```

---

*End of Document*
