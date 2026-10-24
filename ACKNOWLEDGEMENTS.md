# Open-source foundations

## Libraries used

- [Lottie Web](https://github.com/airbnb/lottie-web), MIT: a locally bundled SVG animation player. Wallet, growth and success animation data are original KoraBudget assets; no external Lottie files or hosted animation services are used.

- [Dexie.js and dexie-react-hooks](https://github.com/dexie/Dexie.js), Apache-2.0: local IndexedDB persistence, atomic writes, reactive queries.
- [Workbox](https://github.com/GoogleChrome/workbox), MIT, through [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa), MIT: offline asset and navigation caching.
- [React](https://github.com/facebook/react), MIT; [Vite](https://github.com/vitejs/vite), MIT; [Lucide](https://github.com/lucide-icons/lucide), ISC: UI, build tooling and icons.
- DM Sans and Manrope via Fontsource, SIL Open Font License 1.1. Served locally.

Packages retain upstream license and copyright notices; package-lock.json pins exact versions.

## Product references, no copied source

- [Actual Budget](https://github.com/actualbudget/actual), MIT: distinguish category allocations from actual wallet balances. KoraBudget has its own simpler engine, not Actual's envelope ledger or synchronization system.
- [Cashew](https://github.com/jameskokoska/Cashew), GPL-3.0: phone entry flows, category routines and clear goal progress. No Flutter code or visual assets copied.
- [Firefly III](https://github.com/firefly-iii/firefly-iii), AGPL-3.0: conceptual distinction between transfers, income, expenses and recurring costs. No code copied or server dependency introduced.

Stars informed research, not architecture. Calendar formulas, app views and vector artwork were authored for KoraBudget. Any future source reuse must meet the original license and attribution requirements.
