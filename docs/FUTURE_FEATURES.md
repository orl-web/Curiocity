# CurioCity — Future Features

Ideas and planned features for post-launch updates. Organized by priority and complexity.

---

## 1. Unpopular Opinions

**Concept:** Let creators and travelers share honest, contrarian takes on popular tourist spots. Every guide gets a "Unpopular Opinion" section where locals drop real talk about places everyone recommends but nobody warns you about.

**Why it matters:** Travelers are tired of only seeing 5-star reviews. They want to know the truth — "this restaurant is overpriced," "this island has a 2-hour ferry queue in summer," "this museum is not worth the €25 entry." This builds trust and makes CurioCity feel authentic, not like a marketing platform.

### Features

- [ ] **Unpopular Opinion card on guide pages**
  - Below the main guide content, show a collapsible "Unpopular Opinions" section
  - Each opinion: place name, take (1-3 sentences), upvote/downvote count
  - Anonymous option: "Anonymous Local" for sensitive opinions
  - Badge system: "Verified Local" (lives in the area) vs "Visitor" (been there)

- [ ] **Create an Unpopular Opinion**
  - Button: "Got an unpopular opinion? Share it"
  - Fields: place name, your take (required, max 500 chars), supporting detail (optional)
  - Auto-tag by category: food, sights, transport, accommodation
  - Rate limiting: 3 opinions per user per day

- [ ] **Upvote / Downvote / "Spot On" / "Nah" reactions**
  - 4 reactions instead of just up/down:
    - 👍 "Spot On" — I agree, this is real
    - 👎 "Nah" — I disagree, this place is actually great
    - 🤔 "Interesting" — Not sure, but good to know
    - 🚩 "Warning" — This is actually dangerous/scammy
  - Sort by: most "Spot On", most recent, most controversial

- [ ] **Unpopular Opinion Map Layer**
  - Toggle layer on MapPage showing hotspots with high opinion density
  - Color-coded by sentiment (green = mostly positive take, red = mostly negative)
  - Tap a hotspot → see all opinions for that location

- [ ] **"Hot Takes" feed on HomePage**
  - Trending unpopular opinions section
  - Weekly digest: "This week's hottest takes in Rome"
  - Filter by: city, category, "Most Agreed", "Most Controversial"

- [ ] **Creator response system**
  - Guide creators can respond to opinions on their guides
  - "Thanks for the heads up" or "That was fixed last month"
  - Creates dialogue, not just one-way complaints

- [ ] **Moderation**
  - Flag for: hate speech, personal attacks, false information
  - Auto-flag if 3+ "Nah" reactions (community disagrees strongly)
  - Creator can hide opinions on their own guides (with reason required)

### Content Examples (Rome)

| Place | Unpopular Opinion |
|-------|-------------------|
| Trevi Fountain | "Skip it. You'll spend 45 minutes in a crowd to throw a coin. The fountain itself is... a fountain." |
| Colosseum underground tour | "€24 for a 30-minute tour of dark tunnels. The regular ticket gets you 90% of the same experience." |
| Trastevere restaurants on main street | "Tourist trap prices. Walk 2 minutes into the side streets for half the price and better food." |
| Vatican Museums on Friday evening | "Extended hours sound great until you realize it's packed with school groups and you can't move." |
| Capri day trip | "Ferry + bus + chairlift + lunch = €150+ per person for a crowded island. Stay in Rome." |

---

## 2. Guide Tournaments (Top 10-100 Challenges)

**Concept:** Community-driven tournaments where users compete to find the best guides on a specific topic. Think "Best Local Eats in a Day in Rome" — everyone submits their guide, the community votes, and the Top 10 or Top 100 rise to the top.

**Why it matters:** It gamifies guide creation, drives engagement, and surfaces the best content. Instead of just browsing random guides, users participate in a shared challenge. The winning guides become the definitive resource for that topic.

### Features

- [ ] **Tournament creation**
  - Anyone can create a tournament (or admin-curated)
  - Fields:
    - Title: "Best Local Eats in a Day in Rome"
    - Category: food, architecture, history, art, nature, adventure
    - City / Region / Country / Worldwide
    - Duration: 7 days, 14 days, 30 days
    - Rules: "Must include at least 4 food stops, total walk under 8km"
    - Prize: "Winner gets featured on homepage + €50 gift card" (or just bragging rights)
    - Max participants: optional cap

- [ ] **Tournament page**
  - Header: title, countdown timer, participant count, category badge
  - Rules section (what qualifies, what doesn't)
  - Prize display
  - Progress bar: "X guides submitted, Y days remaining"
  - Tab: "All Submissions" | "Top 10" | "My Entry"

- [ ] **Submit a guide to a tournament**
  - "Enter this tournament" button on tournament page
  - Select one of your existing guides OR create a new one
  - Guide must meet tournament rules (validated on submit)
  - Each user can submit 1 guide per tournament
  - Entry fee: optional (free for MVP)

- [ ] **Voting system**
  - Community votes on submitted guides
  - Vote types:
    - ⭐ "I'd do this" — would actually follow this guide
    - 📍 "Been there" — verified, I've been to some of these stops
    - 🏆 "Best one" — this is the top guide in this tournament
  - One vote per user per guide
  - Can change vote during tournament period
  - Weighted scoring: "Best one" = 3 points, "I'd do this" = 1 point, "Been there" = 0.5 points

- [ ] **Leaderboard**
  - Real-time ranking of all submissions
  - Top 10 highlighted with medals: 🥇 🥈 🥉 for top 3
  - Top 100 shown in a scrollable list
  - Filter: "Most voted", "Most verified (Been there)", "Newest entry"
  - Position changes animated (like sports league tables)

- [ ] **Tournament categories / recurring challenges**

  | Tournament Name | Category | City | Frequency |
  |----------------|----------|------|-----------|
  | Best Local Eats in a Day | Food | Rome | Monthly |
  | Hidden Gems Walk | Architecture | Rome | Monthly |
  | History Buff's Rome | History | Rome | Monthly |
  | Best Street Art Route | Art | Rome | Monthly |
  | Budget Rome in 3 Days | All | Rome | Quarterly |
  | Best Night Walk | All | Worldwide | Monthly |
  | Date Night in Rome | All | Rome | Monthly |
  | Family-Friendly Rome | All | Rome | Quarterly |

- [ ] **Tournament results & archives**
  - After tournament ends, lock voting
  - Show final Top 10 with stats: votes, "been there" count, guide rating
  - Winner announcement with celebration animation
  - Archive all past tournaments (browseable)
  - Winning guide gets "Tournament Winner" badge on the guide forever
  - Winning creator gets profile badge: "🏆 Tournament Winner"

- [ ] **Tournament social features**
  - Share tournament link on social media
  - "I entered the Best Local Eats tournament" share card
  - Tournament-specific comment section
  - Creator AMA during tournament: "Ask me about my guide"

- [ ] **Admin tools**
  - Featured tournaments on homepage
  - Tournament categories page: browse all active tournaments
  - Ability to pin/unpin tournaments
  - Moderate submissions (reject if rules violated)
  - Export tournament results as PDF/CSV

### Tournament Flow

```
1. Creator creates tournament → "Best Local Eats in a Day in Rome"
2. Community sees it on homepage → clicks to view details
3. Users enter by submitting guides → "Enter Tournament" button
4. Voting opens → community votes on submissions
5. Leaderboard updates in real-time → excitement builds
6. Tournament ends → voting locks → final results announced
7. Top 10 guides get "Tournament Winner" badge
8. Winning creator gets profile badge + feature on homepage
9. Tournament archived → becomes a permanent resource
```

### Example Tournament: "Best Local Eats in a Day in Rome"

**Rules:**
- Must include 4-8 food stops
- Total walking distance under 10km
- At least 2 stops must be "local favorites" (not tourist restaurants)
- Must include a breakfast, lunch, and dinner stop
- No chains or franchise restaurants

**Submissions (example):**

| Rank | Guide | Creator | Votes | Been There | Score |
|------|-------|---------|-------|------------|-------|
| 🥇 | "Trastevere Food Crawl" | @marcofoodie | 234 | 89 | 501 |
| 🥈 | "Testaccio: Where Romans Actually Eat" | @rome_local | 198 | 76 | 427 |
| 🥉 | "Centro Storico on a Budget" | @budgetrome | 176 | 54 | 370 |
| 4 | "Jewish Ghetto Food Walk" | @historyeats | 145 | 62 | 331 |
| 5 | "Monti: The Hipster Food Tour" | @monti_life | 132 | 48 | 296 |
| ... | ... | ... | ... | ... | ... |
| 47 | "EUR Business Lunch Route" | @southside | 23 | 8 | 47 |

---

## 3. AR Guide View (Pokémon Go-style)

**Concept:** Use your phone's camera to see the guide come to life — virtual characters, historical reconstructions, and interactive overlays appear on your screen as you walk through the city. Like Pokémon Go, but for learning about real places.

**Why it matters:** Walking tours are visual experiences. Reading text on a screen while looking at a building breaks immersion. AR puts the content INTO the view — see a Roman senator standing where you're standing, watch a fountain "come alive" with historical context, or spot hidden details highlighted on your camera feed.

### Features

- [ ] **AR marker detection on guide stops**
  - When you arrive at a stop, the app detects the location via GPS + compass
  - AR overlay activates automatically (or via "View in AR" button)
  - No QR codes needed — pure geolocation-based triggers

- [ ] **Virtual historical characters**
  - At historical stops, spawn a 3D character in the camera view
  - Examples:
    - Colosseum: gladiator standing at the entrance, "tells" his story
    - Pantheon: Roman architect explains the dome construction
    - Trevi Fountain: coin-throwing tourist from the 1800s
  - Tap character → hear audio narration or read speech bubble
  - Characters wave, gesture, or perform simple animations

- [ ] **Historical reconstruction overlay**
  - Show what the location looked like in the past
  - Slide bar: "Now" ↔ "Year 100 AD" — blend between current view and reconstruction
  - Examples:
    - Roman Forum: overlay the original temples over the ruins
    - Colosseum: show the full arena with crowd and fights
    - Appian Way: show original Roman road with chariots
  - Semi-transparent overlay so you see both past and present

- [ ] **Interactive hotspots on camera feed**
  - Highlight architectural details with glowing markers
  - Tap a hotspot → popup with info, photos, or audio
  - Examples:
    - Fountain details, hidden inscriptions, coat of arms on buildings
    - "This door was built in 1524 by architect X"
    - "Look up — see the hidden gargoyle on the 3rd floor"

- [ ] **AR navigation waypoints**
  - Floating arrows or path markers in the camera view showing where to walk next
  - Distance indicator: "Next stop: 200m →"
  - "You're walking the wrong way" indicator if off-route

- [ ] **Photo mode with AR elements**
  - Take a selfie with a Roman gladiator
  - Capture the historical reconstruction
  - Share to social media with CurioCity watermark
  - AR photo frames: "I walked Rome with CurioCity"

- [ ] **Performance & battery optimization**
  - AR only activates when viewing a guide stop (not always-on)
  - Low-power mode: 2D overlays instead of 3D characters
  - Cache AR assets for offline use
  - Device compatibility check: warn if phone doesn't support AR

### Technical Stack

- [ ] **AR framework:** ARCore (Android) + ARKit (iOS) via Capacitor plugins
- [ ] **3D models:** glTF format, optimized for mobile (< 500KB per model)
- [ ] **Character animations:** Simple idle/wave/talk loops (Mixamo or similar)
- [ ] **Reconstruction images:** Pre-rendered 2D overlays (not full 3D reconstruction — too heavy for mobile)
- [ ] **Asset delivery:** Lazy-load per stop, cache after first view

### Example: Walking the Colosseum

```
1. User arrives near Colosseum → GPS detects proximity
2. "View in AR" button appears on guide page
3. User taps → camera opens with AR overlay
4. Gladiators appear at the entrance → tap to hear their story
5. User walks inside → reconstruction overlay shows the arena in 80 AD
6. Slider: drag left to see ruins, drag right to see full arena
7. Hotspots on arches → tap to learn about each gate
8. At the exit → "Share your AR photo" prompt
9. User takes selfie with gladiator → shares to Instagram
```

---

## 4. Adaptive Audio Speed

**Concept:** The audio narration automatically speeds up or slows down based on how fast you're walking. Standing still? Slow, detailed narration. Walking fast? Quick overview. Running? Just the essentials.

**Why it matters:** Nobody wants to listen to a 5-minute story while standing at a crosswalk. And nobody wants a rushed 10-second summary when they're sitting on a bench admiring a fountain. Adaptive audio makes the experience feel natural — like a knowledgeable friend walking beside you.

### Features

- [ ] **Walking speed detection**
  - Use phone's accelerometer + GPS to calculate walking pace
  - Speed categories:
    - Standing still (< 1 km/h): Full detailed narration
    - Slow walk (1-3 km/h): Normal speed narration
    - Normal walk (3-5 km/h): Slightly faster, key points only
    - Fast walk / jogging (5+ km/h): Quick summary, 30 seconds max
  - Smooth transitions — no jarring speed changes

- [ ] **Manual speed toggle**
  - Override button on audio player:
    - 🐢 Slow (0.75x) — for non-native speakers or complex topics
    - ▶️ Normal (1x) — default
    - 🐇 Fast (1.5x) — for quick overview
    - ⚡ Adaptive (auto) — speed based on walking pace
  - Speed preference saved per user

- [ ] **Content segmentation by depth**
  - Each narration split into 3 levels:
    - **Level 1 (30 sec):** Name, one-line description, key fact
    - **Level 2 (90 sec):** Full context, historical background, interesting details
    - **Level 3 (3+ min):** Deep dive, anecdotes, hidden stories, local tips
  - Adaptive mode picks the right level based on speed
  - Manual mode plays the full segment at chosen speed

- [ ] **Pause-aware playback**
  - If user stops walking for 10+ seconds → offer "Continue listening?"
  - If user is in a hurry (fast pace) → skip intro/outro music
  - Auto-pause when user leaves the stop area (GPS geofence)

- [ ] **Background audio handling**
  - Continues playing when screen is locked
  - Integrates with phone's media controls (lock screen, notification bar)
  - Bluetooth headphone support with tap-to-advance

- [ ] **Audio cues for navigation**
  - Subtle chime when approaching next stop (100m, 50m, arrived)
  - "Turn left in 50 meters" voice prompt if audio is playing
  - Don't interrupt narration for navigation — insert at natural pause points

- [ ] **Offline audio caching**
  - Cache all audio segments for saved guides
  - Pre-download at WiFi quality (128kbps)
  - Storage indicator: "Audio uses 45MB for this guide"

### Example Flow

```
1. User starts "Trastevere Food Crawl" guide
2. Audio player appears: "Adaptive speed: ON"
3. User stands still at Stop 1 (fountain) → detailed 3-min story plays
4. User starts walking to Stop 2 → speed increases, story continues
5. User arrives at Stop 2 (restaurant) → slows down again
6. User sits down for lunch → audio pauses automatically
7. User leaves restaurant → audio resumes with "Next stop: 200m ahead"
8. User is late and walks fast → quick 30-sec overview of Stop 3
```

---

## 5. Skin Shop (Guide Personalization)

**Concept:** Let creators and users customize the look of their guides — custom backgrounds, color schemes, fonts, and layouts. Make every guide visually unique, like customizing a phone theme.

**Why it matters:** Right now every guide looks the same — white background, standard fonts, map on top. A food guide should look warm and inviting. A history guide should feel classic. A street art guide should be bold and colorful. Skins make guides feel personal and premium.

### Features

- [ ] **Skin shop on profile page**
  - "Customize your guides" section
  - Browse available skins by category:
    - 🎨 Colors: solid colors, gradients, seasonal themes
    - 🖼️ Backgrounds: textures, patterns, photos, abstract art
    - ✏️ Fonts: serif, sans-serif, handwriting, mono
    - 📐 Layouts: card style, list style, magazine style, minimal
  - Preview before applying

- [ ] **Free skins (default)**
  - 10-15 free skins included for all users
  - Basic color themes: dark, light, warm, cool, earthy
  - Simple patterns: dots, stripes, waves
  - Standard font pairings

- [ ] **Premium skins (earned or purchased)**
  - Unlock via:
    - Tournament wins: "Champion" skin
    - Guide milestones: "100 reviews" skin, "1000 saves" skin
    - Creator tier: "Local Expert" exclusive skin
    - Purchase: €0.99-2.99 per skin pack
  - Premium features: animated backgrounds, custom fonts, parallax effects

- [ ] **Custom skin creator**
  - Advanced users build their own skin:
    - Upload background image (or choose from gallery)
    - Pick primary/secondary/accent colors
    - Choose font family
    - Adjust spacing, border radius, shadow
  - Save as reusable skin
  - Share skins with community

- [ ] **Guide-specific skin assignment**
  - Each guide can have its own skin
  - Creator applies skin when editing guide
  - "Match skin to content" suggestions:
    - Food guide → warm colors, cozy background
    - History guide → parchment texture, classic serif font
    - Nature guide → green tones, organic patterns
    - Street art guide → bold colors, graffiti-style

- [ ] **Skin components**
  - **Header:** background image/gradient, title font, subtitle style
  - **Stop cards:** border style, shadow, icon style, spacing
  - **Map:** custom map style (dark mode, vintage, watercolor)
  - **Reviews section:** star color, card layout
  - **Share button:** custom icon, placement
  - **Overall:** background texture, body font, accent color

- [ ] **Community skin gallery**
  - Browse skins created by other users
  - "Popular this week" ranking
  - Filter by: color, style, season, creator
  - One-click "Use this skin" on any guide
  - Credit original creator

- [ ] **Seasonal / event skins**
  - Auto-release themed skins:
    - Christmas: snowflakes, red/green palette
    - Halloween: dark, spooky, orange accents
    - Summer: bright, tropical, warm colors
    - Valentine's Day: pink/red, hearts
  - Limited-time availability creates urgency

### Example Skins

| Skin Name | Style | Best For |
|-----------|-------|----------|
| "Roman Gold" | Warm gold/brown, serif font, marble texture | History, architecture guides |
| "Trattoria" | Red/cream, handwritten font, checkered pattern | Food guides |
| "Midnight Rome" | Dark blue/black, neon accents, modern font | Night walks, nightlife |
| "Vintage Postcard" | Sepia tones, aged paper, classic typography | Romantic, nostalgic guides |
| "Street Art" | Bold colors, graffiti font, paint splatter | Art, culture guides |
| "Nature Walk" | Green/earth tones, organic shapes, leaf patterns | Parks, nature, hiking |
| "Minimal" | White/black, clean sans-serif, lots of whitespace | Any guide, professional look |
| "Champion" | Gold accents, trophy icon, premium feel | Tournament winners only |

### Skin Application Flow

```
1. Creator edits a guide → "Customize Appearance" tab
2. Skin shop opens → browse free + premium skins
3. Preview: "How your guide will look" with sample content
4. Select skin → adjust colors if needed
5. Save → guide updated with new skin
6. Users viewing the guide see the personalized design
7. "Created with [Skin Name] by [Creator]" credit at bottom
```

---

## 6. Additional Future Features

### Social & Community

- [ ] **Guide challenges between friends**
  - "You think your food tour is better? Prove it."
  - 1v1 or group challenges on the same topic
  - Side-by-side guide comparison

- [ ] **Guide playlists / collections**
  - Users curate lists: "Best of Rome", "My favorite food guides"
  - Shareable playlist links
  - Collaborative playlists (multiple contributors)

- [ ] **Creator leaderboards**
  - Top creators by: guides created, total votes, tournament wins
  - Monthly "Creator of the Month" feature
  - Tier system: New Creator → Local Expert → City Legend

- [ ] **Guides-by-theme browsing**
  - "Rome for Foodies", "Rome for History Nerds", "Rome on a Budget"
  - Auto-generated from guide tags and categories
  - User-submitted themes

### Content & Discovery

- [ ] **Seasonal guides**
  - "Best of Rome in Summer" / "Winter in Rome"
  - Auto-expire or rotate based on season
  - "Currently relevant" badge on seasonal guides

- [ ] **Guide comparison tool**
  - Side-by-side: "Guide A vs Guide B" for the same area
  - Show: stops, distance, rating, price, time needed
  - "Similar guides" recommendations

- [ ] **"Guide of the Day" automated feature**
  - Algorithm picks best guide based on: recent votes, quality score, freshness
  - Featured on homepage
  - Notification to followers: "Today's guide: [Title]"

- [ ] **Audio tours (TTS)**
  - Auto-generate audio narration from guide descriptions
  - "Listen while you walk" mode
  - Offline audio caching

### Monetization

- [ ] **Guide bundles**
  - "Rome Weekend Pack" — 3 guides at 20% off
  - Creator-created bundles
  - Platform-curated bundles

- [ ] **Creator subscription tiers**
  - Free: basic profile, limited guides
  - Pro: unlimited guides, analytics, priority support
  - Enterprise: custom branding, API access

- [ ] **Affiliate integration**
  - Link to booking.com, getyourguide, etc.
  - Earn commission on referrals from guide pages
  - "Book this experience" buttons on stops

### Technical

- [ ] **Offline-first architecture improvement**
  - Pre-cache popular guides automatically
  - Background sync when connection restored
  - Conflict resolution for offline edits

- [ ] **Real-time guide updates**
  - WebSocket notifications when guide is updated
  - "This guide was updated 2 hours ago" badge
  - Auto-refresh cached offline guides

- [ ] **Multi-language UI**
  - Italian, English, Spanish, French, German, Japanese
  - Community-contributed translations
  - Auto-detect browser language

---

## Feature Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Unpopular Opinions | High | Medium | P1 — Post-MVP |
| Guide Tournaments | High | High | P2 — After Unpopular Opinions |
| AR Guide View (Pokémon Go-style) | High | Very High | P3 — After core features stable |
| Adaptive Audio Speed | High | Medium | P2 — Post-MVP |
| Skin Shop (Guide Personalization) | Medium | Medium | P2 — Post-MVP |
| Guide playlists | Medium | Low | P1 — Post-MVP |
| Creator leaderboards | Medium | Low | P1 — Post-MVP |
| Audio tours (TTS) | Medium | Medium | P2 |
| Seasonal guides | Low | Low | P2 |
| Guide bundles | Medium | Low | P3 |
| Multi-language UI | High | High | P3 |
| Real-time updates | Medium | High | P3 |
| Affiliate integration | Medium | Medium | P3 |
