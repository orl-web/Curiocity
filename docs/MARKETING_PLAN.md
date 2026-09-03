# CurioCity Marketing Campaign Plan

## Project Review Summary

| Area | Status | Notes |
|------|--------|-------|
| **Core Platform** | ✅ Complete | 21 tables, full CRUD, auth, payments |
| **Frontend** | ✅ Complete | React 19, dark mode, PWA, offline support |
| **Backend** | ✅ Complete | Express + Drizzle, rate limiting, JWT |
| **SEO** | ✅ Complete | Meta tags, robots.txt, sitemap, OG images |
| **Content Moderation** | ✅ Complete | Auto-flag system (3+ reports) |
| **Guide Versioning** | ✅ Complete | Auto-save on edit, restore endpoint |
| **Referral System** | ✅ Complete | Code generation, apply, stats |
| **Landing Page** | ✅ Complete | Email capture, value props, skip-login |
| **Newsletter** | ✅ Complete | Subscribe/unsubscribe endpoints |
| **Skip-Login** | ✅ Complete | Onboarding, login, register pages |
| **Search Autocomplete** | ✅ Complete | Debounced search with suggestions |
| **Dark Mode** | ✅ Complete | ThemeProvider + all pages themed |
| **External Services** | ⏳ Blocked | Stripe, S3, Anthropic, SendGrid |

---

## 1. Campaign Overview

**Campaign Name:** *"CurioCity — Discover Rome Like a Local"*

**Summary:** Launch campaign to acquire 500 beta users and 50 guide creators in Rome within 6 weeks, positioning CurioCity as the go-to platform for curated, offline-capable walking guides.

**Primary Objective:** Generate 500 registered users and 50 published guides from Rome-based creators in 6 weeks.

**Secondary Objectives:**
- Achieve 1,000 app installs (PWA) in first month
- Secure 5 local travel blog features
- Build email list of 2,000 subscribers

---

## 2. Target Audience

### Primary: Travelers (B2C)
> **Urban travelers aged 25-45** visiting Rome who want authentic, local experiences beyond tourist traps. They typically discover travel content through Instagram, TikTok, and travel blogs. They value offline access (no roaming charges), curated content over generic guides, and support for local creators.

- **Pain points:** Generic tourist guides, expensive tour groups, no offline access, language barriers
- **Channels:** Instagram, TikTok, Reddit r/travel, travel blogs, Google Maps
- **Buying stage:** Awareness → Consideration (researching Rome trip)

### Secondary: Local Creators (B2C)
> **Rome-based tour guides, food bloggers, and culture enthusiasts** who want to monetize their local knowledge. They discover platforms through creator communities, LinkedIn, and word-of-mouth.

- **Pain points:** No easy way to monetize local expertise, dependency on tour agencies, no control over pricing
- **Channels:** LinkedIn, Instagram, local creator meetups, tourism forums
- **Buying stage:** Consideration → Decision (evaluating platforms to publish on)

---

## 3. Key Messages

**Core Message:** *"CurioCity gives you Rome's hidden gems — curated by locals, available offline, powered by AI."*

| Message | Audience | Proof Point |
|---------|----------|-------------|
| "Skip the tourist traps — discover what locals actually love" | Travelers | 14 hand-curated Rome guides with GPS-located stops |
| "Works offline — no roaming charges needed" | Travelers | Full offline support via IndexedDB + Service Worker |
| "Turn your local knowledge into income" | Creators | Built-in payments, €0.99/guide or free with ads |
| "AI-powered descriptions save you hours" | Creators | One-click description generation from stop names |
| "Free maps, no API key required" | Both | OpenStreetMap + Leaflet, zero cost |

---

## 4. Channel Strategy

| Channel | Why It Fits | Content Format | Effort | Budget % |
|---------|-------------|----------------|--------|----------|
| **Instagram** | Visual travel content, 25-45 demo | Reels, Stories, carousel posts | Medium | 25% |
| **TikTok** | Viral travel content, younger travelers | Short-form video (15-60s) | Medium | 20% |
| **Travel Blogs** | SEO, credibility, long-form | Guest posts, reviews | Medium | 15% |
| **Reddit** | Community trust, r/travel, r/italy | Value-first posts, AMAs | Low | 5% |
| **Email** | Nurture, retention, announcements | Newsletter, drip sequences | Low | 10% |
| **Local Partnerships** | Creator acquisition, credibility | Meetups, co-marketing | Medium | 15% |
| **Product Hunt** | Tech audience, early adopters | Launch page, community | Low | 5% |
| **SEO** | Long-term organic traffic | Blog content, guide pages | Medium | 5% |

---

## 5. Content Calendar (6 Weeks)

| Week | Content Piece | Channel | Owner/Notes | Status |
|------|--------------|---------|-------------|--------|
| **Pre-Launch** | | | | |
 | -2 | Landing page with email capture | Website | Dev team | ✅ Done |
| -2 | "Coming soon" teaser video (15s) | Instagram, TikTok | Content | ⬜ |
| -1 | Behind-the-scenes creator onboarding | Instagram Stories | Content | ⬜ |
| -1 | Press kit + media outreach | Email, LinkedIn | Marketing | ⬜ |
| **Week 1: Launch** | | | | |
| 1 | Product Hunt launch page | Product Hunt | Marketing | ⬜ |
| 1 | Launch announcement blog post | Blog, Email | Content | ⬜ |
| 1 | "5 Hidden Gems in Rome" Reel | Instagram, TikTok | Content | ⬜ |
| 1 | Reddit AMA: "We built a free travel guide app" | Reddit r/travel | Founder | ⬜ |
| **Week 2: Content Blitz** | | | | |
| 2 | "How to Use CurioCity" tutorial video | YouTube, TikTok | Content | ⬜ |
| 2 | Guest post: "Why Local Guides Beat Tourist Traps" | Travel blog | Marketing | ⬜ |
| 2 | Creator spotlight: Meet [Creator Name] | Instagram, LinkedIn | Content | ⬜ |
| 2 | Email: Welcome sequence for new signups | Email | Marketing | ⬜ |
| **Week 3: Social Proof** | | | | |
| 3 | User-generated content campaign | Instagram | Content | ⬜ |
| 3 | "Download offline" feature highlight | TikTok, Reels | Content | ⬜ |
| 3 | Travel blogger review outreach | Email | Marketing | ⬜ |
| 3 | Local creator meetup in Rome | In-person | Founder | ⬜ |
| **Week 4: Engagement** | | | | |
| 4 | "Best Rome Walking Routes" blog series | Blog | Content | ⬜ |
| 4 | Poll: "What city should we add next?" | Instagram, Twitter | Content | ⬜ |
| 4 | Referral program announcement | Email, Social | Marketing | ⬜ |
| 4 | Creator earnings milestone celebration | LinkedIn, Instagram | Content | ⬜ |
| **Week 5: Expansion** | | | | |
| 5 | "CurioCity vs. Other Travel Apps" comparison | Blog, Reddit | Content | ⬜ |
| 5 | Collaborative guide with local influencer | Instagram, TikTok | Content | ⬜ |
| 5 | Email: "Your Rome trip checklist" nurture | Email | Marketing | ⬜ |
| 5 | SEO-optimized guide pages (city landing pages) | Website | Dev + Content | ⬜ |
| **Week 6: Optimization** | | | | |
| 6 | Campaign performance report | Internal | Marketing | ⬜ |
| 6 | "What we learned" blog post | Blog | Content | ⬜ |
| 6 | Retargeting ads for website visitors | Instagram, Google | Marketing | ⬜ |
| 6 | Plan next city expansion based on data | Internal | Team | ⬜ |

---

## 6. Content Pieces Needed

| Asset | Type | Description | Priority | Timeline |
|-------|------|-------------|----------|----------|
| Landing page | Web | Email capture + value prop | Must-have | Pre-launch |
| Launch video (15s) | Video | Teaser for social | Must-have | Pre-launch |
| Product Hunt page | Web | Launch assets + description | Must-have | Week 1 |
| Tutorial video (60s) | Video | How to use CurioCity | Must-have | Week 2 |
| "Hidden Gems" Reel | Video | 5 spots in Rome | Must-have | Week 1 |
| Creator spotlight | Video/Carousel | Interview with local creator | Must-have | Week 2 |
| Press kit | PDF | Brand assets + stats | Nice-to-have | Pre-launch |
| Blog series (4 posts) | Article | Rome travel tips | Nice-to-have | Weeks 2-5 |
| Email sequences (3) | Email | Welcome, nurture, re-engage | Must-have | Weeks 1-4 |
| Referral landing page | Web | Share code + rewards | Nice-to-have | Week 4 |
| Instagram templates | Design | Consistent brand visuals | Nice-to-have | Pre-launch |

---

## 7. Success Metrics

| KPI | Target | How Tracked | Cadence |
|-----|--------|-------------|---------|
| **Registered users** | 500 | Auth API (users table) | Weekly |
| **Published guides** | 50 | Guides API (isPublished=true) | Weekly |
| **PWA installs** | 1,000 | Service Worker registration | Weekly |
| **Email subscribers** | 2,000 | Email platform | Weekly |
| **Blog features** | 5 | Manual tracking | Monthly |
| **Day-7 retention** | 30% | Analytics events | Weekly |
| **Creator earnings** | €500 total | Payments API | Monthly |

---

## 8. Budget Allocation (No Budget Provided)

**Channel-agnostic plan** — prioritize organic/earned channels:

| Category | Approach | Est. Cost |
|----------|----------|-----------|
| Content production | DIY (founder + freelance) | €500-1,000 |
| Paid social ads | Reserve for retargeting only | €0 (Phase 1) |
| Influencer partnerships | Barter (free guide access) | €0 |
| Tools | Buffer, Canva, email platform | €50-100/mo |
| Events | Local meetup (coffee + venue) | €100-200 |
| **Total (6 weeks)** | | **€700-1,300** |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Low creator adoption** | No content = no users | Seed with 14 existing Rome guides, offer early-bird revenue share |
| **PWA install friction** | Users don't install | Clear install prompt, emphasize offline benefit |
| **Competition from TripAdvisor/Google** | Users default to known apps | Position as "local-first, offline-capable" niche |
| **No paid budget** | Slow growth | Focus on SEO, Reddit, partnerships for organic growth |

---

## 10. Next Steps

### ✅ Completed
1. ~~Set up Stripe test account~~ — Code-complete, needs API keys
2. ~~Create landing page~~ — Done at `/landing` with email capture
3. ~~Newsletter endpoint~~ — `POST /api/newsletter/subscribe` + `/unsubscribe`
4. ~~Skip-login feature~~ — "Skip — use offline" on onboarding, login, register
5. ~~Dark mode~~ — Full theme support across all pages
6. ~~Search autocomplete~~ — Debounced search with suggestions on HomePage
7. ~~Content moderation~~ — Auto-flag system (3+ reports)
8. ~~Guide versioning~~ — Auto-save on edit, restore endpoint
9. ~~Referral system~~ — Code generation, apply, stats

### 🔴 Must Do (Blockers)
10. Set up Stripe test account — payment flow is code-complete but needs keys
11. Record 15s teaser video — Instagram/TikTok launch asset

### 🟡 Should Do (High Impact)
12. Write Product Hunt description — prepare for launch day
13. Set up email platform — Mailchimp/Substack for newsletter
14. Create Instagram account — brand presence before launch
15. Write 3 "Hidden Gems" posts — content for first week

### 🟢 Could Do (Nice to Have)
16. Design Instagram templates — consistent brand visuals
17. Write press kit — media outreach asset
18. Set up analytics — Mixpanel/PostHog for tracking
