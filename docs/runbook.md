# Runbook

## Requirements

Node.js 22, Java 21 (for the Firestore emulator), a Chromium for Playwright (`npx playwright install chromium`).
No Google account, no Firebase login, no API keys. The project id `demo-audit-cloud` starts with `demo-`, which keeps
the Firebase CLI and SDKs fully offline against the emulators.

## Common tasks

| Task | Command |
|---|---|
| Install | `npm ci` |
| Start emulators (auth, firestore, functions) | `npm run emulators` |
| Seed demo data (second terminal) | `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed` |
| Dev server | `npm run dev`, then open http://127.0.0.1:5173 |
| Unit and component tests | `npm test` |
| Firestore rules tests | `npm run test:rules` |
| E2E against emulators | `npm run build && npm run e2e:emu` |
| E2E without emulators (in-browser backend) | `npm run e2e:offline` |
| Clustering evaluation | `npm run ai:eval` (writes `ai/eval/report.md`) |
| Bundle budget | `npm run build && npm run perf:budget` |
| Lighthouse CI | `npm run build && npm run perf:lhci` |

## Demo users (emulator only)

| Email | Password | Role |
|---|---|---|
| auditor@demo.test | demo-password | auditor |
| manager@demo.test | demo-password | manager |
| viewer@demo.test | demo-password | viewer |

## Troubleshooting

- `Could not load data` on the dashboard: the emulators are not running or not seeded.
- Port already in use: stop old emulator processes, ports are 9099, 8080, 5001.
- The scheduled `overdueActionCheck` does not fire in the emulator (no Pub/Sub emulator configured). Managers use
  "Run overdue check" on the Actions page, which calls the same logic through `triggerOverdueCheck`.
