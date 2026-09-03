# CurioCity

A travel guide platform where local creators publish curated walking guides with AI-generated descriptions, audio narration, and interactive OpenStreetMap maps.

## Quick Start

### Prerequisites
- Node.js >= 20
- PostgreSQL (or Docker)

### With Docker (recommended)
```bash
cp .env.example .env   # Edit with your secrets
docker-compose up
```
- Frontend: http://localhost:3002
- Backend API: http://localhost:3001
- Database: localhost:5432

### Manual Setup
```bash
# Start PostgreSQL (or use existing instance)
# Create database
createdb curiocity

# Configure environment
cp services/api/.env.example services/api/.env
# Edit services/api/.env with your DATABASE_URL and secrets

# Install dependencies
npm install

# Run migrations and seed
npm run db:migrate
npm run db:seed

# Start dev servers
npm run dev:api    # Backend on :3001
npm run dev:web    # Frontend on :3002
```

## Architecture

```
CurioCity/
├── apps/web/          React + Vite + Tailwind frontend
├── services/api/      Express + TypeScript + Drizzle backend
├── packages/          Shared packages (config, types, ui)
├── infra/             Infrastructure (Docker, K8s, Terraform)
└── docs/              Documentation, ADRs, runbooks
```

### Tech Stack
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS v4, React Router v7, Leaflet (OpenStreetMap)
- **Backend:** Express, TypeScript, Drizzle ORM, PostgreSQL
- **Auth:** JWT (access + refresh tokens)
- **Payments:** Stripe Checkout + Connect
- **AI:** Anthropic Claude (description generation, translation, formatting)
- **Storage:** S3-compatible (presigned URLs)
- **Maps:** Leaflet + OpenStreetMap (free, no API key required)
- **Offline:** IndexedDB via `idb` library, Service Worker caching

## Demo Account
- **Email:** demo@curiocity.app
- **Password:** demo123

## Features

### Core
- **Guide Discovery** — Browse, search, and filter guides by city, category, and proximity
- **Interactive Maps** — OpenStreetMap-powered maps with numbered stop markers and polylines
- **Guide Creation** — Multi-stop guide builder with AI-powered description generation
- **Reviews & Ratings** — Star ratings and text reviews on guides
- **Comments** — Threaded comments with replies
- **Save/Bookmark** — Save guides to your profile

### GPS & Import/Export
- **GPS Import** — Import routes from GPX, KML, or CSV files to auto-populate stops with coordinates
- **GPS Export** — Export any guide as GPX, KML, or JSON file
- **Reverse Geocoding** — Auto-detect city from imported GPS coordinates

### AI-Powered
- **Description Generation** — Claude generates curiosity descriptions for each stop
- **Description Formatting** — Import .txt/.md/.docx files and AI formats them into guide descriptions
- **Translation** — Translate guides to 8 languages

### Map Page
- **Full-Screen Map** — Dedicated map view showing all guides around you
- **Colored Routes** — Nearby guides as dashed polylines, saved guides as solid orange
- **User Location** — Blue dot showing your current position
- **Toggle Filters** — Show/hide nearby vs saved guides

### Offline Support
- **Download for Offline** — Save any guide to IndexedDB for offline viewing
- **Offline Indicator** — Red banner when connection is lost
- **Service Worker** — Caches guide pages and API responses
- **Offline Guide List** — Profile tab showing downloaded guides

### Creator Tools
- **Analytics Dashboard** — Track earnings, guide views, and saves
- **Stripe Connect** — Receive payments directly to your bank account
- **Draft System** — Save unpublished guide drafts

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in |
| POST | /api/auth/refresh | Refresh token |
| GET | /api/guides | List guides (supports lat/lng/radius) |
| POST | /api/guides | Create guide (auth) |
| GET | /api/guides/:id | Guide detail with stops, costs, resources |
| GET | /api/guides/:id/export?format=gpx\|kml\|json | Export guide data |
| POST | /api/payments/checkout | Purchase guide |
| POST | /api/ai/generate-descriptions | AI stop descriptions |
| POST | /api/ai/format-description | AI description formatting |
| POST | /api/ai/translate | Translate guide |

Full API documentation: `GET /api/docs`

## Environment Variables

See `services/api/.env` for all configuration options. Required in production:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing JWTs
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

## Known Limitations

See `docs/MVP_STATUS.md` for full list of bugs and missing features.

## License

Private — All rights reserved.
