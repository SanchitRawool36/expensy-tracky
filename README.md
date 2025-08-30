
# Finance Ledger


A single-file, in-browser finance ledger to track multiple bank accounts, income, expenses, and recurring payments. No backend required—data stays in your browser.

# Finance Ledger

Lightweight, single-file personal finance ledger you can clone and use locally. Everything runs in the browser — no server, no account required. Ideal for tracking multiple bank accounts, monthly income, expenses, recurring payments, and simple savings goals.

This repository contains:
- `index.html` — the entire app (HTML + CSS + JS) in one file.
- `README.md` — this document.

Quick design goals:
- Minimal, privacy-first: all data stays in the user’s browser unless exported.
- Portable: use the browser UI or export/import JSON/Excel for backups and migration.
- Small surface area: no build step; open the file or serve it locally.

## Quick start (clone and run)

1. Clone this repository:

```powershell
git clone https://github.com/SanchitRawool36/expensy-tracky.git
cd expensy-tracky
```

2. Open the app:

- Option A — open directly: double-click `index.html` in your file manager and open it in a modern browser (Chrome, Edge, Firefox, Safari).
- Option B — run a simple local web server (recommended to avoid some file:// restrictions):

```powershell
# From the project folder on Windows using Python 3
python -m http.server 8080
# then open http://localhost:8080/index.html in your browser
```

## Features

- Multiple bank accounts with balances and quick-select chips
- Income and expense logging (timestamped) with categories and per-account tracking
- Recurring expenses (fixed/variable) with intervals, occurrences, and optional auto-pay
- Goals support (progress tracking and fund allocation). Default build ships with no pre-defined goals.
- Monthly ledger history: close a month and keep a saved archive of past months
- CSV/Excel export (current month or combined history sheets) and full JSON backup/restore
- Simple UI with toast notifications and privacy toggles for sensitive numbers

## Important runtime details

- Storage: the app uses browser localStorage under the key `financeLedgerStateClean`.
- Reset: the Reset All Data button is gated by a passphrase prompt. The current reset key in this clean build is: `DELETE` (type exactly to confirm).
- Default goals: this build starts with an empty `goals` object (no predefined goal data).

Notes on storage and migration
- localStorage is origin-bound. If you open the file via `file://` vs `http://localhost`, the storage will be different. Use the JSON Backup/Restore to move data between origins or machines.
- localStorage capacity varies by browser (commonly several MB). For large exports use the provided Excel/JSON export features.

## Privacy & security

All data is stored locally in the browser. This repository does not collect or transmit any personal data. Do not store secrets or sensitive authentication tokens in the app. Backups saved to JSON/Excel are unencrypted — treat them as sensitive files on your machine.

## Contributing

This project is intentionally small and single-file. If you'd like to contribute:

1. Fork the repo and make changes on a feature branch.
2. Keep changes focused and explain them in the PR description (UI, bugfix, accessibility, or packaging are common contributions).
3. If you add new files or dependencies, include a short `README` section explaining how to run and test them.

Suggested next improvements (low-risk):
- Add a small automated test for the JS helpers.
- Split JS into modules and add a build pipeline (only if the project outgrows being single-file).
- Add a `LICENSE` file (MIT is a common permissive choice).

## Troubleshooting

- If the UI looks broken, try a different modern browser (Chrome, Edge, Firefox) or clear site data for the origin.
- If backup/restore fails, open the browser console for errors (right-click → Inspect → Console). This build has minimal debug logging.

## License

This repository does not include a license file by default. If you plan to make it public, consider adding a license such as MIT by creating a `LICENSE` file.

---

If you want, I can also:
- add an MIT `LICENSE` file,
- create a trimmed `index-clean.html` variant with comments removed for lighter cloning,
- or split JS into a separate `app.js` and add a minimal `package.json` to help contributors.
- Restore: Settings → "Restore Backup" and select the backup JSON.
- What’s included: the entire app state, including accounts, history, goals, and recurring items.

Tip: Before changing your hosting URL (e.g., GitHub Pages to Netlify), download a Backup and restore it at the new URL.

## Exports

- Expense Ledger (CSV): current month; columns: Date, Description, Category, Account, Amount (₹).
- Overall Expenses (Excel): choose 3m/6m/1y/5y range. Produces a combined sheet plus per-month sheets.

## Keyboard and navigation

- Month history navigation: ArrowLeft/ArrowRight to move Previous/Next.
- Viewing banner appears when you’re not on the current month, with a quick "Back to Current".

## Privacy

- Eye toggles hide values for Total, Income, and Spent on-screen.
- Local-only: no data leaves your device unless you export or deploy your site publicly.

## Deploy

### GitHub Pages

1) Commit `index.html` (and this README) to a GitHub repo.
2) Settings → Pages → Build and deployment → Source = "Deploy from a branch"; Branch = `main`; Folder = `/ (root)`.
3) Open the published URL.

Note: Data saved on GitHub Pages lives in your browser for that Pages origin. It will not automatically appear on other domains.

### Netlify

- Site type: Static site
- Build command: none
- Publish directory: repo root (where `index.html` is)
- Deploy via "Import from GitHub" or drag-and-drop

If you later move between GitHub Pages and Netlify, use Backup/Restore to migrate your data.

## Tech stack

- Tailwind CSS (via CDN)
- Chart.js (spending chart, via CDN)
- SheetJS (Excel export, via CDN)
- Plain HTML/CSS/JS in a single file (`index.html`)

## Troubleshooting

- Excel export not working: ensure network access to the SheetJS CDN. The app shows a toast if the library is unavailable.
- Data missing after moving hosts: use Settings → Backup/Restore to migrate across domains.
- Reset requires passphrase `Sanchit2005`. This is a local safeguard only.

---

This is a local-first app. Keep regular Backups if you rely on it for important records.
