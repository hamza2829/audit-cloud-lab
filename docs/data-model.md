# Data model (Firestore)

| Collection | Key fields | Written by |
|---|---|---|
| `auditTypes` | `name`, `checklist[] {id, text}` | seed, managers |
| `audits` | `title`, `typeId`, `site`, `auditor`, `plannedDate` (YYYY-MM-DD), `status` (planned, in_progress, closed), `checklist[] {id, text, result}` | auditors, managers |
| `findings` | `auditId`, `title`, `description`, `severity` (low to critical), `category`, `imageDataUrl` (optional, max 150 KB), `createdAt`, `createdBy`, `riskScore`, `riskBand` | auditors create; `riskScore` and `riskBand` only by the `onFindingCreated` function |
| `actions` | `findingId`, `auditId`, `title`, `owner`, `dueDate`, `status` (open, done), `overdue` | auditors create and close; `overdue` only by the overdue check |

Roles are custom auth claims (`role`: auditor, manager, viewer) set by `seed/seed.ts`.
Rules live in `firebase/firestore.rules`, tests in `tests/rules/`.

## Risk score

`riskScore = 20 x severity level (1..4) + 5 x min(4, earlier findings of the same category at the same site)`, capped at 100.
Bands: below 35 low, 35 to 54 moderate, 55 to 74 high, 75 and above severe. Code: `shared/risk.ts`.

## Photos

Photos are downscaled in the browser (max 640 px, JPEG) and stored as a data URL inside the finding document.
This keeps the demo on the Firestore emulator only (no Storage bucket). A real deployment should use Cloud Storage instead.
