# OnLead

VK automation platform: customer cabinet, API, and admin panel.

**Production:** [https://onlead.m360-ural.online/](https://onlead.m360-ural.online/)  
**Admin:** [https://onlead.m360-ural.online/admin](https://onlead.m360-ural.online/admin)

**Local-only demo accounts** (seeded for `npm start` / Docker local — **not** production credentials):

- Cabinet: `artem@onlead.local` / `demo1234`
- Admin: `admin@onlead.local` / `admin1234`

VK apps (same as [online-lead.ru](https://online-lead.ru)): base `5530956`, messages `6463690`, redirect `https://oauth.vk.com/blank.html`.

## Architecture

| Layer | Location |
| --- | --- |
| API host | `server/index.mjs` (~113 lines) → `server/routes/dispatch.mjs` + **16** route modules |
| Domain logic | `server/*.mjs` (billing, leadgen, jobs, landings, tg, …) |
| SPA shell | `js/app.js` (mount / `render` / `officePage` / binders) |
| UI modules | `js/*-ol.js` (**36** feature modules) |
| Click handlers | `js/click-*-ol.js` (**9** domains) + `js/office-click-ol.js` dispatcher |
| Catalog / prices | `js/catalog.js` |
| Router | `js/router.js` |

Storage: **SQLite schema v10** (`data/onlead.sqlite`). `data/store.json` is a backup mirror only.

## Local run

```bash
npm start
```

Open http://127.0.0.1:4173/ (canonical public URL: `https://onlead.m360-ural.online`).

## Tests

```bash
npm test
npm run test:e2e
```

**210** unit/smoke tests + **8** Playwright E2E scenarios: billing, CRM, VK tools, landings, workflow, team workspace, RBAC, hash routing, API wiring, TG receipts.

## Deploy to VPS

```powershell
.\scripts\deploy-remote.ps1
```

See [docs/production.md](docs/production.md) for the production checklist, env vars, and health checks.

## Parity backlog

Feature matrix vs online-lead.ru: [docs/online-lead-parity.md](docs/online-lead-parity.md).
