# UDH-304 Dorm Payments

## In one paragraph

UDH-304 is a private dorm-payment app for one household of up to 3 admins and 8
renters, built with Expo (React Native + TypeScript) for iOS, Android, and web.
Admins open monthly billing periods, add one electricity/WiFi/water/rent bill per
period, and review renter payments with photo receipts; renters pick their stay
dates, see exactly what they owe, and pay per bill. Electricity, WiFi, and water
are prorated by each renter's stay days while rent always splits equally. The app
talks **directly to Supabase** (Auth + PostgreSQL + private Storage) with no
server layer — every permission is enforced by row-level security in the
database itself, wrapped in a mobile-first, dark-mode, floating-glass UI.

## In more detail

**Function.** Access is limited to eight fixed accounts (`admin`, `tenant1`–`tenant7`)
that sign in with a household username and password — no sign-ups, no Google.
Inside, an admin starts a billing period (e.g. "October 2026") and records the
month's bills, one per type. Renters open the bill, see a transparent breakdown
of their share (bill total × their stay-days ÷ household stay-days, or an equal
split for rent and when no days are recorded), submit a payment with an optional
receipt photo, and track due-date countdown chips. Admins approve or reject each
payment, toggle member access, watch per-bill collection progress, and export a
period report — a chat-ready summary or a full CSV of every renter × every bill.

**Architecture.** The front end is a single Expo Router codebase: file-based
routes (`(tabs)` for Overview/Bills/Activity/Admin, plus modal flows), React
context providers for auth, household data, theme, and toasts, and a typed API
layer over `supabase-js`. The back end is pure Supabase: Postgres tables for
households, profiles, billing periods, bills, stay dates, payments, and an audit
log; a trigger that caps the household at 3 admins and 8 renters; row-level
security policies that give renters access to only their own rows and admins
household-wide control; a security-definer `stay_day_total()` function that
shares aggregate stay-day counts without exposing anyone's dates; and a private
Storage bucket where receipts are reachable only by their owner and admins via
short-lived signed URLs. The web build is a static single-page app
(`expo export` → `dist/`) hosted on Vercel with only the public anon key inlined —
the service-role key exists solely in the local bootstrap script that created
the eight accounts.

## Features

- Username + password sign-in for the fixed household accounts (`admin`, `tenant1`–`tenant7`) — no Google, no sign-ups
- Billing periods with one bill per type (electricity, WiFi, water, rent) per period
- Personal shares split equally across active renters
- Renters: pay their share, attach a receipt photo, pick their stay dates
- Admins: add bills, review/approve/reject payments, view receipts, manage members, open new periods
- Quarter spending chart and activity feed derived from real bill/payment data
- Light/dark theme, mobile-first, works in any browser too

## Project structure

- `app/` — Expo Router screens (`login`, `(tabs)`, and `modal/` flows)
- `src/lib/` — Supabase client, auth/household providers, theme, API helpers
- `src/components/` — shared UI (cards, buttons, chart, calendar)
- `scripts/bootstrap.mjs` — one-time creation of the 8 household accounts
- `supabase/schema.sql` — tables, capacity trigger, RLS policies, receipt bucket
- `supabase/migrations/` — incremental migrations for existing projects
- `vercel.json` — static web export hosting settings + security headers

## Setup

```bash
npm install
cp .env.example .env   # fill in EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY
npm start              # Expo dev server: press i (iOS), a (Android), w (web)
```

The anon key is safe to embed in the app — RLS does the guarding. The service-role
key is **only** used by `scripts/bootstrap.mjs` and must never reach the app.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. If the project already had the old schema, also run `supabase/migrations/20261006_direct_client_access.sql`.
4. Enable Email authentication under Authentication. No OAuth providers are used.
5. Put the service-role key and the 8 account passwords in `.env`, then run:

   ```bash
   npm run bootstrap
   ```

   This creates `admin` + `tenant1`–`tenant7` (emails `*@udh304.local`) and a
   starter billing period. Hand each password to the right person, then rotate or
   remove those passwords from `.env`.

## Web deployment (optional)

`vercel.json` is set up for the static web export:

```bash
npx expo export --platform web   # outputs dist/
```

Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in Vercel
Project Settings so the build can inline them.

## Data and payment rules

- A billing period has a label, start/end dates, and a due date; each period can
  hold one electricity, WiFi, water, and rent bill.
- Renters submit **one payment per bill** with an optional receipt image, stored
  in the private `payment-receipts` bucket (owner + admins only).
- Payments start as `submitted`; an admin approves or rejects them.
- Shares are equal splits for now; stay dates are recorded so a usage/day-stay
  formula can replace the equal split later.
- Every admin mutation is written to `audit_log`.
- A database trigger enforces max 3 active admins and 8 active renters.

## Security notes

- Rotate the 8 account passwords after first sign-in if any were shared insecurely.
- Keep receipts private (they are, by bucket policy) and review the RLS policies
  whenever a new table is added.
- `npm run typecheck` checks the TypeScript before you ship changes.
