# Ortaq Maliyyə

Shared finance platform scaffold built from the PRD in [`plans/ortaq-maliyye-implementation-plan.md`](plans/ortaq-maliyye-implementation-plan.md).

## Stack

- User app: React + Vite + TypeScript + PWA
- Admin: same React app under `/admin`
- Backend: Fastify + TypeScript
- Database: SQLite + Drizzle + better-sqlite3
- Offline queue: IndexedDB
- Push: Web Push + Service Worker
- Deploy: Docker Compose + Caddy

## Workspace layout

- [`web`](web) — PWA and admin UI scaffold
- [`api`](api) — Fastify API scaffold
- [`shared`](shared) — shared constants and types
- [`docker`](docker) — deployment scaffolding

## Current status

The repository contains scaffold code for:

- Apple-style mobile-first user UI
- `/admin` route group in the same React app
- Fastify modular route structure
- Drizzle SQLite schema and seed scaffolding
- HTTP-only cookie session strategy
- Docker Compose and Caddy deployment baseline

## Production readiness snapshot

This repository is now closer to a production baseline, but it is **not yet a fully finished production system**.

Implemented hardening in this pass:

- real pending sync badge in the app header using backend summary + IndexedDB queue
- stricter production env validation for session secrets
- configurable session TTL, cookie domain, and proxy trust
- `/health` and `/ready` endpoints for uptime/readiness checks
- production seed guard rails to prevent accidental weak/default seeding
- Docker Compose healthchecks and production env template
- Caddy security headers and readiness proxying

Still recommended before real launch:

- CI/CD pipeline with typecheck, lint, build, smoke tests
- backup automation + restore drill for SQLite
- rate limiting / login brute-force protection
- centralized error tracking and structured log shipping
- complete offline sync lifecycle (`pending -> syncing -> synced/failed`) on the client
- migration plan to Postgres if multi-user concurrency grows

## PWA optimization notes

The web app is configured with `vite-plugin-pwa` using an inject-manifest service worker.

- Service worker source: `web/src/sw.ts`
- Runtime caching:
  - `/api/*` requests: `NetworkFirst` (short-lived cache fallback)
  - scripts/styles/workers: `StaleWhileRevalidate`
  - images: `CacheFirst`
- App shell navigation fallback to `/index.html` for SPA routes
- Push notification handlers are in the same service worker (so offline + push works together)

Installability improvements included in the app manifest and HTML metadata:

- richer manifest fields (`id`, `lang`, `orientation`, `categories`, `shortcuts`)
- iOS-friendly meta tags (`apple-mobile-web-app-*`)
- `apple-touch-icon` and app-level theme/application metadata

### PWA install troubleshooting (Chrome / Android)

If Chrome only shows **"Add to Home screen"** and the app opens in a normal Chrome tab, check the origin:

- `http://localhost` can behave as installable during local development
- `http://192.168.x.x:port` is **not** a secure origin for full PWA standalone install behavior
- use `https://...` (trusted certificate) for LAN/domain testing

After changing manifest/service worker, always:

1. Remove old shortcut/icon
2. Clear site storage + unregister previous service worker
3. Re-open the new URL and install again

## Important local setup note

The current machine does not have `node` / `npm` installed yet, so dependency installation and runtime verification could not be executed from this workspace.

Once Node.js is installed, use:

```sh
npm install
npm run build
npm run typecheck
```

For development:

```sh
npm run dev
```

For database work:

```sh
npm run db:generate
npm run db:migrate
npm run seed
```

## Production environment setup

1. Copy `.env.production.example` to a real private env file.
2. Replace `SESSION_SECRET` with a strong random value of at least 32 chars.
3. Set real domains for `VITE_API_BASE_URL`, `COOKIE_DOMAIN`, and `CORS_ORIGIN`.
4. Set VAPID keys if push notifications are required.
5. Keep `ALLOW_PROD_SEED=false` unless you intentionally seed a fresh production database.

## Deployment

The included `docker-compose.yml` is intended as a production-oriented baseline.

```sh
docker compose up -d --build
```

Useful checks:

```sh
curl http://localhost/health
curl http://localhost/ready
```
