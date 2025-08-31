# Finance Ledger

A lightweight, in-browser finance ledger to track bank accounts, income, expenses, goals, and recurring payments. No backend required — data stays in your browser.

This repository contains:
- `index.html` — main app page (loads external `app.js`).
- `index-clean.html` — trimmed production variant.
- `app.js` — application logic.
- `README.md` — this document.
- `LICENSE` — MIT license.
- `package.json` — local dev server scripts (no dependencies required).

Quick design goals:
- Privacy-first: all data remains in your browser unless you export it.
- Portable: export/import JSON/Excel for backups and migration.
- Zero build: open the file or serve it locally.

## Quick start (clone and run)

1) Clone the repo

```powershell
git clone https://github.com/SanchitRawool36/expensy-tracky.git
cd expensy-tracky
```

2) Open the app
- Option A — double-click `index.html` to open in a modern browser.
- Option B — serve locally (recommended):

```powershell
npm start
# opens http://localhost:5173
```

Alternative (Python):
```powershell
python -m http.server 8080
# then open http://localhost:8080/index.html
```

## Development

- Use the built-in script to serve locally:

```powershell
npm start
```

- Edit `index.html` and `app.js`. The production-friendly `index-clean.html` uses the same `app.js` but with minimal markup/comments.

## Features

- Multiple bank accounts with balances and quick-select chips
- Income/expense logging with categories and per-account tracking
- Recurring expenses (fixed/variable), intervals, occurrences, optional auto-pay
- Goals with progress and fund allocation (no predefined goals by default)
- Monthly ledger history with archived months
- CSV/Excel exports and full JSON backup/restore
- Privacy toggles and toast notifications

## Important runtime details

- Storage: localStorage key `financeLedgerStateClean`.
- Reset: requires passphrase `DELETE` in the prompt.
- Default goals: starts with an empty `goals` object.

Notes on storage and migration
- localStorage is origin-bound (`file://` vs `http://localhost` are different). Use Backup/Restore to move data across origins or machines.
- localStorage capacity varies by browser; for larger history use the Excel/JSON exports.

## Privacy & security

All data is stored locally in the browser. This app does not collect or transmit personal data. Backups (JSON/Excel) are unencrypted — store them securely.

## Contributing

1) Fork and create a feature branch.
2) Keep PRs focused and explain the change (UI, bugfix, accessibility, packaging).
3) If adding files or deps, document how to run/test in the PR.

Suggested small improvements:
- Light unit tests for helpers
- Optional module split/build only if the project outgrows simple static hosting

## Exports

- Expense Ledger (CSV): current month; columns include Date, Description, Category, Account, Amount (₹)
- Overall Expenses (Excel): pick 3m/6m/1y/5y; includes a combined sheet plus per‑month sheets

## Deploy

GitHub Pages
1) Push to a public repo with `index.html` at the repo root
2) Settings → Pages → Deploy from a branch → Branch: `main` → Folder: `/ (root)`
3) Open the published URL

Netlify
- Site type: Static site
- Build command: none
- Publish directory: repo root

Note: Data stored on one origin (domain) won’t appear on another; use Backup/Restore to migrate.

## Multi-device sync (optional backend)

This app is local-first. To use it on multiple devices with the same data, add a backend to store a copy of your state and sync it.

Recommended: Supabase (Postgres + Auth)
- What you’ll build: store the entire app state (the same JSON you back up) in a `jsonb` column per user; use Row Level Security (RLS) so users can only access their own state.

1) Create a Supabase project (Database + Auth enabled)
2) Create the table (SQL)
```
create table if not exists public.ledger_states (
	user_id uuid not null references auth.users(id) on delete cascade,
	id text not null default 'default',
	state jsonb not null,
	updated_at timestamptz not null default now(),
	primary key (user_id, id)
);
alter table public.ledger_states enable row level security;
create policy "read own" on public.ledger_states for select using (auth.uid() = user_id);
create policy "insert own" on public.ledger_states for insert with check (auth.uid() = user_id);
create policy "update own" on public.ledger_states for update using (auth.uid() = user_id);
create policy "delete own" on public.ledger_states for delete using (auth.uid() = user_id);
```

3) Add the Supabase client to the app (CDN) and wire a minimal login + sync
- Add the script (public anon keys are safe to use client-side):
```
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```
- Create the client in `app.js` with env values (e.g., injected at deploy time):
```
const SUPABASE_URL = window.env?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.env?.SUPABASE_ANON_KEY;
const sb = (SUPABASE_URL && SUPABASE_ANON_KEY)
	? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
	: null;
```
- Auth (example): magic link via email
```
await sb.auth.signInWithOtp({ email });
// On callback/opened session: const { data: { user } } = await sb.auth.getUser();
```
- Sync strategy (simple, practical)
	- On load: if logged in, fetch server state `select state, updated_at where id='default'`. Compare timestamps with local; if server newer, replace local; if local newer, offer to push.
	- On every save: write localStorage, then `upsert` to Supabase with `updated_at=now()`.
	- Conflict policy: last-write-wins is acceptable for single-user usage. For collaboration, add version numbers and a merge prompt.

4) Deployment and env vars
- Frontend (static): Vercel/Netlify. Inject `SUPABASE_URL` and `SUPABASE_ANON_KEY` as public env (client-readable).
- Backend: Supabase is fully managed — nothing else to deploy.

Alternatives
- Firebase (Firestore + Auth): similar flow; store one doc per user with the full JSON state.
- PocketBase (self-hosted): single binary with SQLite and auth; deploy on Fly.io/Render; expose `/api/collections/states`.
- Appwrite: managed/self-hosted BaaS with DB + Auth.
- Minimal custom server: Node/Express with SQLite/Postgres exposing `/state` GET/PUT for a user; deploy on Render/Fly/Heroku and protect with auth.

Security notes
- Do not commit private service keys. Client apps should only use public/anon keys meant for the browser.
- Keep RLS on for Supabase; write policies exactly as above to restrict to `auth.uid()`.
- Set allowed origins/CORS to your deployed frontend.

## Tech stack

- Tailwind CSS (CDN)
- Chart.js (CDN)
- SheetJS (CDN)
- Plain HTML/CSS/JS (`index.html` + `app.js`)

## Troubleshooting

- Excel export issues: ensure the SheetJS CDN is reachable
- Data missing after host change: use Backup/Restore to migrate
- UI issues: try a modern browser or clear site data for the origin

## License

MIT — see `LICENSE`.
