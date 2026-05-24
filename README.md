# Project Dignity Hobbs — C.O.R.E.

**C.O.R.E.** (Community Outreach & Resource Engine) is a mobile-first PWA for anonymous client resource tracking and volunteer dispensing at Project Dignity Hobbs.

- **Target launch:** June 13, 2026
- **Repository:** [github.com/jerichog0731-spec/ProjectDignityApp](https://github.com/jerichog0731-spec/ProjectDignityApp)
- **Technical spec:** [docs/PDH-CORE-SPEC.md](docs/PDH-CORE-SPEC.md)
- **Agent playbook:** [AGENTS.md](AGENTS.md)
- **Cursor Team Kit:** [docs/TEAM-KIT.md](docs/TEAM-KIT.md)

## Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- `lucide-react`, `qrcode.react`
- Airtable via `/api/v1/*` routes (keys server-side only)
- PWA: `@ducanh2912/next-pwa` with in-app update prompt on new deploys
- Config-driven resources: [lib/config/resources.ts](lib/config/resources.ts)

## Implementation status

- **Step 1 (done):** Next.js scaffold, Airtable lib, PWA, required onboarding (first name + family size before QR), `/api/v1` routes
- **Step 2 (next):** Eligibility engine and volunteer dispense UI
- **Step 3:** QR scanner and offline transaction queue

## Local setup

1. Copy `.env.example` to `.env.local` and set Airtable + `ADMIN_PIN`.
2. Create Airtable tables `Clients` and `Transactions` per [docs/PDH-CORE-SPEC.md](docs/PDH-CORE-SPEC.md).
3. Install dependencies and run dev:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). PWA service worker is disabled in development; test install/update on a production build (`npm run build && npm start`).

## Recommended extensions

Installed via workspace recommendations: ESLint, Tailwind CSS IntelliSense, Prettier, Playwright.

## Environment variables

See [.env.example](.env.example). Use `ADMIN_PIN` on the server only (never `NEXT_PUBLIC_*` for secrets).
