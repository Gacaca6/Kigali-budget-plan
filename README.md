# KoraBudget 2

A free, phone-only offline budget planner for everyday life in Rwanda. General fintech design, RWF amounts and Kigali dates. No AI keys, accounts, analytics, backend or subscriptions. Fonts and assets ship locally.

## Run

Requires Node.js 22.14+ and npm.

```sh
npm ci
npm run dev
```

Development: http://localhost:3000. For the installable offline build:

```sh
npm run build
npm run preview
```

Preview: http://localhost:4173. Serve `dist/` over HTTPS to install on a physical phone. LAN HTTP does not support service workers. Open online once and wait for “Offline ready”; everyday use then works offline. Updates prompt before reloading. Build regenerates wallet icons and third-party license notices.

## Choose what fits your life

- Start fresh by default. No income or student routine is assumed. An optional student template adds bursary, tickets and meals.
- Add multiple income sources. Salary, business, freelance, bursary, family support, pension and custom types are independent from their schedules.
- Daily, selected weekdays, weekly, fortnightly, monthly, every two or three months, yearly, custom day/week/month intervals, one-time and irregular income.
- Choose money-received planning or expected-income planning. Dashboard separates actual wallet balances from budget funding and future expectations.
- Record a full payment and allocate it across 1–24 chosen budget months. Whole francs are distributed exactly; rounding remainders go to the first covered months.
- Add, rename and reorder wallets and categories. Renames update existing records atomically.
- Simple planned costs, with optional quantities, custom dates, recurring intervals and exclusions. Monthly dates preserve the anchor day, clamping to the last day in shorter months.
- Monthly and yearly views; income, expense and transfer history; savings goals; JSON backup/restore; monthly CSV export.
- Green wallet branding throughout, including SVG favicon, Apple touch icon, normal PWA icons and a maskable Android icon.
- A wallet splash screen, local Lottie illustrations and save feedback, gentle sheet/page transitions and tactile buttons. Reduced-motion preferences disable transitions and show static animation frames. The landing page has no secondary marketing subtitles.

## How funding works

Actual wallet balance = opening balance + recorded income − recorded expenses ± transfers, as of today in Kigali. Expected income never adds money to a wallet. Transfers never count as spending or income; enter fees separately.

Each income transaction has a first budget month and months covered. This allocates recorded money, independently of its receipt date. Opening balances enter a plan only when explicitly assigned, and cannot be allocated more than once across months.

Money-received mode funds the plan from allocated recorded receipts plus assigned opening funds. Expected-income mode uses the larger of expected allocations and recorded allocations **for each source and month**, plus other income and opening allocations. Select the matching income source when recording a scheduled payment to avoid double counting. An irregular source has no invented payment dates or expected amount.

Forecast expenses = actual spending + unspent planned costs on scheduled dates. Select a planned cost when recording an expense to consume that occurrence's amount. Extra spending and overruns increase the forecast. Unrecorded past occurrences remain expectations, not completed transactions.

Budget remaining = funding − forecast − savings reserve. This is a plan, not a spendable bank balance. A reserve applies from the first budget month onward. Goal trackers do not move funds or debit wallets; avoid assigning the same savings to several goals. Unspent monthly funding does not automatically roll over. Edit payment coverage or opening allocations explicitly.

Schedule edits recalculate earlier projections while preserving transactions. Removing a cost or source preserves actual records and their allocations, detaching their link. Income sources repeat until their end dates, except one-time and irregular sources. Holidays and breaks must be excluded explicitly.

## Optional student example

40,000 RWF monthly and 80,000 RWF every two months can both allocate 40,000 per month. In October 2026, two 500 RWF tickets plus one 700 RWF meal on each of 22 weekdays total 37,400 RWF, leaving 2,600 before other costs or reserves. Prices are example inputs, not current fare claims.

## Migration and backups

Version 1 IndexedDB records upgrade transactionally to version 2. The previous single income plan becomes one income source; “Meals” becomes “Food & groceries”. Actual amounts, wallet balances, linked expenses and goals are preserved. Older income receipts had no source metadata: they are flagged for review rather than guessed. Review them and select a source or confirm other income, especially when using expected-income mode.

JSON backups from versions 1 and 2 are supported. Validate schema and references before confirming replacement. Version 2 backups include sources, custom categories, wallet order and payment allocations. CSV is for analysis, not restoration, and escapes spreadsheet formulas. Old Gemini localStorage plan history uses a different schema and is not imported or deleted.

Data stays in this browser. Persistent storage is requested but is not a backup. Export regularly: a lost phone, browser reset or storage eviction can remove local records. Backups contain unencrypted financial data; store privately. No bank/SMS access, cloud sync or guaranteed background notifications. English interface; reviewed Kinyarwanda translations are future work.

## Verify

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover real calendar schedules, multiple income sources, allocation conservation, extra receipts, planning modes, transfers, backups and actual v1 IndexedDB migration. Phone browser tests cover optional onboarding, category and wallet customization, financial flows, backup restore, offline restart/recording and widths from 320px to desktop while retaining a phone canvas.

See [ACKNOWLEDGEMENTS.md](./ACKNOWLEDGEMENTS.md) for foundations and license notices. Dexie and Workbox are used directly; Actual, Cashew and Firefly III are product references, not copied application source.
