# OnLead

VK automation platform: customer cabinet, API, and admin panel.

**Production:** [https://onlead.m360-ural.online/](https://onlead.m360-ural.online/)  
**Admin:** [https://onlead.m360-ural.online/admin](https://onlead.m360-ural.online/admin)

Demo cabinet: `artem@onlead.local` / `demo1234`  
Admin: `admin@onlead.local` / `admin1234`

VK apps (same as [online-lead.ru](https://online-lead.ru)): base `5530956`, messages `6463690`, redirect `https://oauth.vk.com/blank.html`.

## Storage

Production uses **built-in Node.js SQLite** (`node:sqlite` with `--experimental-sqlite`). Data lives in `data/onlead.sqlite` with a normalized schema (**v10**). `data/store.json` is a mirror for backups and rollback only — not the primary source in production.

Local development falls back to JSON if SQLite is unavailable.

## Local run

```bash
npm start
```

Open http://127.0.0.1:4173/ (canonical public URL in code: `https://onlead.m360-ural.online`).

## Tests

```bash
npm test
```

**200** unit/smoke tests (`server/**/*.test.mjs`): billing, CRM, VK tools, landings, workflow, hash routing, API wiring.

## Deploy to VPS

```powershell
.\scripts\deploy-remote.ps1
```

See [docs/production.md](docs/production.md) for the production checklist, env vars, and health checks.

## Parity backlog

Feature matrix vs online-lead.ru: [docs/online-lead-parity.md](docs/online-lead-parity.md).
