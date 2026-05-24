# Technical Specification: Project Dignity Hobbs (PDH) C.O.R.E. Client & Volunteer PWA

## 1. Project Overview & Context
* **Project Name:** Project Dignity Hobbs (PDH)
* **System Codename:** C.O.R.E. (Community Outreach & Resource Engine)
* **Environment:** Mobile-First Progressive Web App (PWA)
* **Target Launch Date:** June 13, 2026
* **Deployment Target:** Vercel (Hobby Tier / Serverless Environment)
* **Database Backend:** Airtable REST API
* **Core Philosophy:** Trauma-informed, low-barrier, data-driven, completely anonymous client tracking to satisfy municipal and foundation metrics (e.g., JF Maddox Foundation) without violating community trust.

---

## 2. System Architecture & Tech Stack
* **Framework:** Next.js (App Router or Pages Router, default to App Router for optimization)
* **Styling:** Tailwind CSS (Responsive, High-Contrast Mobile-First Design)
* **Icons:** `lucide-react`
* **State Management:** React Context API (for Session and Admin PIN Auth)
* **PWA Engine:** `@ducanh2912/next-pwa` (service worker with offline caching, background sync hooks, and **auto-update** when a new deployment is published)
* **Database Interface:** Native `fetch` API communicating via Next.js Serverless API routes to abstract Airtable API Keys.
* **Extensibility:** Resource categories, cooldown intervals, and copy live in `lib/config/` so new kits or rule changes do not require rewiring every screen.

---

## 2a. Extensibility & Auto-Update

* **Configurable resources:** Hygiene, Laundry, Cleaning, and Special are defined in a single config module (`lib/config/resources.ts`). Adding a category or changing cooldown days updates eligibility everywhere.
* **Environment-driven backend:** Airtable base ID and table names come from env vars so staging/production can diverge without code changes.
* **PWA auto-update:** On each deploy, the service worker detects a new build and prompts the user to refresh (or applies `skipWaiting` after confirmation) so volunteers and clients always run the latest logic without reinstalling.
* **API versioning:** Route handlers are grouped under `/api/v1/` so future breaking changes can ship as `/api/v2/` without disrupting existing installs.

---

## 3. Database Schema (Airtable Blueprint)

### Table 1: `Clients`
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `ClientID` | Single Line Text (Primary Key) | Randomly generated alphanumeric string (e.g., `PDH-XXXX`) |
| `FirstName` | Single Line Text | **Required** before a digital card / QR is issued. First name only (no last name). |
| `FamilySize` | Number | **Required** before QR issuance. Minimum 1. Used for population-impact metrics. |
| `LastHygieneDate` | Date/Time | Timestamp of last Hygiene Kit dispensation. |
| `LastLaundryDate` | Date/Time | Timestamp of last Laundry Kit/Voucher dispensation. |
| `LastCleaningDate` | Date/Time | Timestamp of last Cleaning Kit dispensation. |
| `LastSpecialDate` | Date/Time | Timestamp of last Special Item (e.g., Bleach Tablets) dispensation. |

### Table 2: `Transactions`
| Field Name | Type | Description |
| :--- | :--- | :--- |
| `TransactionID` | Autonumber | Unique ledger ID. |
| `ClientID` | Link to `Clients` | Relational link to the respective client profile. |
| `Category` | Single Select | `Hygiene`, `Laundry`, `Cleaning`, `Special` |
| `Timestamp` | Date/Time | Precise execution time of inventory checkout. |

---

## 4. Core Features & Business Logic

### Feature 1: The Client-Facing Mobile View
* **No Authentication Barrier:** Clients do not create accounts or passwords. The unique QR code assigned to them acts as their secure authorization token.
* **Onboarding Module:** If a client loads the app without a token, they see a short form first—**First Name** (required) and **Family Size** (required, number ≥ 1). Only after both fields validate can they tap **"Generate My Digital Card"**.
    * Submitting creates a `ClientID`, persists the record via the API, and displays a permanent QR code on screen.
    * Returning clients with a saved token skip the form and go straight to the eligibility dashboard.
* **Eligibility Dashboard:** Displays the client's current status for each resource using a simple visual UI (Traffic Light Paradigm):
    * 🟢 **Green (Eligible):** Resource is available for pickup.
    * 🔴 **Red (Locked):** Displays a countdown timer until the item is next available.

### Feature 2: Volunteer Scan & Check-In Interface
* **Native Camera Scanner:** Embedded component using an open-source QR library (e.g., `html5-qrcode` or `react-qr-reader`).
* **Lookup Sequence:** Once a barcode is resolved to a `ClientID`, the app queries the serverless API wrapper for that client record.
* **Frequency Ledger Time-Locks (Hardcoded Logic):**
    * **Hygiene Kit:** Available 1x every **7 days** (`CurrentDate - LastHygieneDate >= 7`).
    * **Laundry Kit / Voucher:** Available 1x every **14 days** (`CurrentDate - LastLaundryDate >= 14`).
    * **Cleaning Kit:** Available 1x every **30 days** (`CurrentDate - LastCleaningDate >= 30`).
    * **Special Items (Bleach Tablets):** Available 1x every **60 days** (`CurrentDate - LastSpecialDate >= 60`).

### Feature 3: Secure Session Admin Override Panel
* **PIN Protection:** All dispensing actions and data overrides are gatekept behind a 4-digit PIN validated **server-side** via `ADMIN_PIN` (never expose the PIN in client env vars).
* **Action State Changes:** When a volunteer selects an eligible (Green) item and hits "Dispense":
    1. The app verifies the active session PIN status.
    2. An entry is appended to the `Transactions` table.
    3. The specific timestamp field in the `Clients` row is updated to the current server timestamp.
* **Emergency Bypass:** Admins can bypass a 🔴 Red lock during crises (e.g., domestic violence displacement, structural fires) via a privileged PIN confirmation modal.

---

## 5. Offline-First Resilience Engine
* **UI Caching:** Service workers cache all static core views (`/`, `/admin`, icons, layout styles) so the physical interface opens in zero-connectivity environments.
* **Data Queueing (Write-Ahead-Logging):** If an transaction is performed while offline:
    1. The payload is intercepts and saved directly to the browser's `localStorage` queue.
    2. The UI visually indicates a pending sync state.
    3. A background process listens for the browser `online` event listener. Upon reconnection, it executes a sequential batch push to the serverless API routes to sync with Airtable.

---

## 6. Prompt Prompts Sequence for Cursor Implementation

### Step 1: Initialize Project Structure
> Build out a Next.js directory matching this spec using Tailwind CSS. Setup `lib/airtable.js` to structure CRUD operations safely over API. Add the complete configuration for PWA deployment using the standard `next-pwa` service worker engine.

### Step 2: Build the Core Eligibility Component
> Write the logic for the volunteer dashboard. Implement the four core frequency checks using vanilla JS `Date` handling against the defined 7, 14, 30, and 60-day limits. Code the interactive visual buttons to turn red or green natively based on server response values.

### Step 3: Implement Camera Scanning and Local Storage Queues
> Integrate a camera scanner layout. Build the offline data fallback handler to catch failed API fetches, append transactions to `localStorage` with a status flag of "pending", and implement the automated flush function once `navigator.onLine` fires true.
