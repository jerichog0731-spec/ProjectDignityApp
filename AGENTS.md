# Agent playbook — Project Dignity C.O.R.E.

Canonical requirements: [docs/PDH-CORE-SPEC.md](docs/PDH-CORE-SPEC.md).

## Current phase

**Step 1 complete.** Step 2 (eligibility + volunteer UI) is next unless the user requests otherwise.

## Non-negotiables

- Trauma-informed, low-barrier UX; no client accounts or passwords.
- **Onboarding:** First name and family size (≥ 1) are **required** before generating a QR / `ClientID`.
- Client identity is an anonymous `ClientID` encoded in a QR token; persist in `localStorage` as `pdh_client_id`.
- All Airtable access goes through `/api/v1/*` routes; never expose `AIRTABLE_API_KEY` to the browser.
- Admin PIN is **server-only** (`ADMIN_PIN` in env). Do not use `NEXT_PUBLIC_ADMIN_PIN`.
- Resource cooldowns and labels come from [lib/config/resources.ts](lib/config/resources.ts) — do not hardcode duplicate intervals in UI.
- Honor frequency locks unless an authenticated admin bypass is confirmed server-side.

## Implementation sequence

### Step 1 — Project structure (done)

- Next.js App Router, TypeScript, Tailwind, `lucide-react`, `qrcode.react`
- `lib/airtable.ts`, `lib/config/resources.ts`, `lib/config/env.ts`
- PWA via `@ducanh2912/next-pwa` + [components/PwaUpdatePrompt.tsx](components/PwaUpdatePrompt.tsx)
- Client onboarding: [components/ClientOnboarding.tsx](components/ClientOnboarding.tsx)
- APIs: `POST /api/v1/clients`, `GET /api/v1/clients/[clientId]`, `GET /api/v1/config`

### Step 2 — Eligibility engine

Implement volunteer dashboard logic with traffic-light UI driven by `RESOURCE_DEFINITIONS`:

| Category | Field | Cooldown (days) |
|----------|-------|-----------------|
| Hygiene | `LastHygieneDate` | 7 |
| Laundry | `LastLaundryDate` | 14 |
| Cleaning | `LastCleaningDate` | 30 |
| Special | `LastSpecialDate` | 60 |

Dispense flow (server): verify PIN session → append `Transactions` row → update the matching `Last*Date` on `Clients`.

### Step 3 — Scanner and offline queue

- QR scan via `html5-qrcode` or equivalent on `/volunteer`
- On failed network writes, queue payloads in `localStorage` with `status: "pending"`
- On `window` `online`, flush queue sequentially to `/api/v1/transactions`

## Airtable schema (summary)

**Clients:** `ClientID`, `FirstName` (required), `FamilySize` (required), `LastHygieneDate`, `LastLaundryDate`, `LastCleaningDate`, `LastSpecialDate`

**Transactions:** `TransactionID`, `ClientID` (link), `Category` (`Hygiene` | `Laundry` | `Cleaning` | `Special`), `Timestamp`

## Routes

| Route | Role |
|-------|------|
| `/` | Required onboarding → digital card + QR |
| `/volunteer` | Scan + dispense (Step 2) |
| `/api/v1/clients` | Create client |
| `/api/v1/clients/[clientId]` | Load client |
| `/api/v1/config` | Resource definitions for UI |

## Extensibility

- New resource types: add to `RESOURCE_DEFINITIONS` and Airtable schema.
- Breaking API changes: add `/api/v2/` alongside v1.
- PWA updates: new Vercel deploy → service worker update → user prompt in `PwaUpdatePrompt`.

## Quality checks

`/check-compiler-errors`, `/verify-this` (eligibility dates), `/run-smoke-tests` — see [docs/TEAM-KIT.md](docs/TEAM-KIT.md).
