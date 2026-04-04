# Zubia — AI-Powered Renter's Command Center

## Tech Stack
- **Runtime**: Bun (NOT Node, NOT Express, NOT Vite)
- **Server**: Bun.serve() with HTML imports
- **Frontend**: React 19 + custom CSS (NOT Tailwind)
- **Database**: bun:sqlite with WAL mode
- **AI**: Claude API via @anthropic-ai/sdk
- **Port**: 3342
- **Font**: Inter (Google Fonts)

## Commands
- `bun install` — Install dependencies
- `bun --hot index.ts` — Start dev server with hot reload
- `bun index.ts` — Start production server
- `bun seed-demo.ts` — Seed demo data manually

## Architecture
- `index.ts` — Bun.serve() HTTP server with all API routes
- `db.ts` — SQLite database setup and schema
- `ai.ts` — Claude API integration (extraction, scoring, reports, comparison, advisor, scam detection)
- `seed-demo.ts` — Demo data for Trang's Bay Area rental search
- `frontend/` — React SPA with component-per-page architecture
- `styles.css` — Full custom CSS, no Tailwind

## Design
- Primary: Deep teal (#0F766E)
- Accent: Warm coral (#F97066)
- Backgrounds: Warm white (#FAFAF8)
- Night-friendly, calm, premium feel
- NO emojis anywhere — clean SVG icons only

## Database
SQLite file: `zubia.db` (auto-created on first run)
Auto-seeds demo data if users table is empty.

## Environment
Copy `.env` from `~/Projects/homeschool-assistant/.env` for ANTHROPIC_API_KEY.
