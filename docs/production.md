# OnLead production guide

## Stack

| Piece | Role |
| --- | --- |
| `onlead-app` (Docker) | Node 22 API + static cabinet/admin |
| Caddy (shared VPS) | TLS + reverse proxy to `onlead:4173` |
| `data/onlead.sqlite` | Primary storage (built-in `node:sqlite`, WAL) |
| `data/store.json` | JSON mirror for backup/restore |
| `/opt/onlead/backups` | Off-volume backup rotation |
| S3 / MinIO (optional) | Remote backup copies |

## Code layout (production image)

| Path | Role |
| --- | --- |
| `server/index.mjs` | HTTP host + static; no business routes inline |
| `server/routes/*.mjs` | 16 API modules via `dispatch.mjs` (+ RBAC, `headersSent` guard) |
| `js/app.js` | SPA mount / render / office routing |
| `js/*-ol.js` | Feature UI modules |
| `js/click-*-ol.js` | Domain `data-act` handlers |
| `js/office-click-ol.js` | Click dispatcher + tool form submit |

## Boot requirements

Production (`NODE_ENV=production`) **requires** built-in SQLite. The container sets:

```yaml
NODE_OPTIONS: --experimental-sqlite
```

If SQLite cannot open, the process exits — there is no JSON-only fallback on prod.

### Required env (`.env.prod`)

| Variable | Notes |
| --- | --- |
| `TOKEN_ENCRYPTION_KEY` | Random 64-char hex; not the `.env.example` placeholder |
| `ADMIN_PASSWORD` | Strong password; not `admin1234` |
| `PUBLIC_URL` | `https://onlead.m360-ural.online` |
| `VK_APP_ID` / `VK_REDIRECT_URI` | `5530956` + `https://oauth.vk.com/blank.html` |

### Payments & mail (live)

| Variable | Notes |
| --- | --- |
| `PAYMENTS_MODE` | `live` for real YooKassa |
| `YOOKASSA_SHOP_ID` / `YOOKASSA_SECRET_KEY` | Same shop as post2post |
| `SMTP_*` | Outbound mail (synced from post2post on deploy) |

`mock:` VK tokens are rejected when `ALLOW_MOCK_TOKENS` is unset in production.

## Deploy

From Windows:

```powershell
.\scripts\deploy-remote.ps1
```

On the server (`/opt/onlead`):

```bash
bash scripts/deploy-server.sh
```

Deploy builds the image, starts compose, wires MinIO network, reloads Caddy, and waits for health.

## Health

`GET /api/health` (public, no auth):

```json
{
  "ok": true,
  "storage": "sqlite-schema",
  "storageSchema": 10,
  "paymentsLive": true,
  "mailConfigured": true,
  "mocksAllowed": false,
  "telegramLive": true,
  "backups": { "remoteOk": true }
}
```

Expected production values:

- `storage`: `sqlite-schema` (not `json`)
- `storageSchema`: `10` (see `server/schema.mjs`)
- `mocksAllowed`: `false`

Admin panel shows SQLite schema version on the dashboard.

## Storage scale (deferred)

SQLite schema v10 is intentional for the current single-node VPS footprint
(backups to local offsite + S3). **Postgres / HA** is deferred until load or
availability requirements outgrow one node — not a go-live blocker.

Do not start a Postgres migration without: sustained write pressure, multi-node
need, or an explicit ops decision. Until then keep hourly offsite + S3 restores
tested (`scripts/restore-store.sh`).

## Service audit

`/api/health` only reports configuration. To check that every service actually
answers — YooKassa, SMTP, each Telegram bot and VK token, AI chat and image,
backups, worker, landings — run the audit inside the container:

```bash
docker exec onlead-app node scripts/service-audit.mjs
docker exec onlead-app node scripts/service-audit.mjs --send-mail   # also delivers a test letter
```

It prints one line per service and exits `1` if anything is `FAIL`, so it can
gate a deploy. `OFF` means deliberately not configured (geo backups, legal
requisites); `WARN` is a data state worth a look, not an outage.

## Ops scripts (inside container)

Use the DB loader (SQLite-first), not raw `store.json`:

```bash
docker exec onlead-app node --experimental-sqlite scripts/inspect-billing.mjs
docker exec onlead-app node --experimental-sqlite scripts/inspect-ai.mjs
docker exec onlead-app node --experimental-sqlite scripts/probe-yookassa-payment.mjs
```

## Backups

- Hourly JSON + SQLite copies via `server/backup.mjs`
- Off-site dir: `BACKUP_OFFSITE_DIR=/app/data/offsite` → host `/opt/onlead/backups`
- Optional S3: `S3_BACKUP_*` (synced from post2post MinIO on deploy)

Restore JSON snapshot:

```bash
bash scripts/restore-store.sh /opt/onlead/backups/store-YYYYMMDD-HHMMSS.json
```

## Pre-go-live checklist

Verified on prod (`onlead.m360-ural.online`) 2026-09-03 via `/api/health` + `docker exec onlead-app node scripts/service-audit.mjs` (FAIL 0 after pausing a stale `congratulation-vk` campaign that never ticked).

- [x] `GET /api/health` → `storage: sqlite-schema`, `mocksAllowed: false`
- [x] `ADMIN_PASSWORD` changed from seed value (len ≠ seed `admin1234`)
- [x] `TOKEN_ENCRYPTION_KEY` is unique 64-char hex (not `.env.example` placeholder)
- [x] YooKassa live (`paymentsLive: true`, shop API OK, history has payments)
- [x] SMTP configured (`mailConfigured: true`, smtp.mail.ru:465 connects)
- [x] VK OAuth app `5530956` + redirect `https://oauth.vk.com/blank.html`
- [x] Backups: `backups.remoteOk: true` (local offsite 48 + S3 `onlead-backups`)
- [x] Legal requisites: operator + INN from YooKassa merchant (`itn`) via Settings / `scripts/apply-legal.mjs` → `legal` OK in audit
