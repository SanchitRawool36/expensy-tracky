
# Finance Ledger


A single-file, in-browser finance ledger to track multiple bank accounts, income, expenses, and recurring payments. No backend required—data stays in your browser.

## Quick start

- Open `index.html` in any modern browser.
- Add a bank account, then start logging income and expenses.
- Use the CSV/Excel exports or Backup/Restore to save or migrate data.

Optional (local web server):

```powershell
# From the project folder on Windows, using Python (if installed)
python -m http.server 8080
# Then open http://localhost:8080/index.html
```

## Features

- Multiple bank accounts with balances and quick-select chips
- Income and expense tracking with timestamps and categories
- Account-aware expenses (each expense records the source account)

- Recurring expenses (fixed/variable), occurrences, intervals, and optional auto-pay
- Monthly due dashboard, calendar view, and spending doughnut chart
- Month save/close with history and fast Prev/Next navigation + banner
- CSV export for the current month’s expense ledger (includes Account column)
- Overall Expenses Excel export for 3m/6m/1y/5y ranges (combined sheet + per-month sheets)
- Full JSON Backup download and one-click Restore
- Sticky top header, mobile-friendly layout, toasts for validation/messages
- Privacy eye-toggles for hiding totals/income/spent on screen
- Reset is gated by a passphrase: `DELETE`

## Data storage

- Persistence: browser `localStorage` under key `financeLedgerStateClean`.
- Capacity: usually about 5–10 MB per origin (varies by browser). That’s thousands of entries in practice, but not unlimited.
- Lifetime: persists until the user clears site data; private/incognito modes do not persist after the session. Browsers may evict under storage pressure, mostly on mobile.
- Origin-bound: data does not migrate between different URLs/domains. Use Backup/Restore to move data.

## Backup and Restore

- Backup: Settings → "Download Backup (JSON)".
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
