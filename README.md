# UDH-304 Dorm Payments

UDH-304 is a shared dorm payment dashboard for up to 3 administrators and 8 renters.

## Project structure

- `index.html` - responsive renter/admin dashboard and account creation screen
- `app.js` - local prototype behavior, role limits, bill tracking, payments, calendar, and chart input
- `styles.css` - responsive light/dark interface
- `api/` - Vercel serverless functions for Supabase authentication, admin management, bills, payments, and receipt uploads
- `supabase/schema.sql` - production database schema, capacity constraints, audit log, RLS policies, and private receipt storage bucket
- `supabase/migrations/` - migrations for existing Supabase projects
- `.env.example` - required deployment variables
- `vercel.json` - security headers and Vercel settings

## Local preview

For the static prototype:

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173/casa7-dashboard/` when serving from the workspace root.

For the Vercel functions and production data path:

```bash
npm install
vercel dev
```

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Enable Email authentication under Authentication. Google authentication is not used.
4. Copy `.env.example` to `.env` and fill in the Supabase URL, anon key, service role key, bootstrap code, designated account passwords, and app URL.
5. For an existing database, run `supabase/migrations/20261004_designated_accounts.sql`.
6. Deploy the project with the Vercel root set to `casa7-dashboard`.
7. Add the same variables in Vercel Project Settings. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

The one-time `POST /api/auth/bootstrap` endpoint creates `admin` and `tenant1` through `tenant7` from server-only password variables. Remove `UDH_BOOTSTRAP_CODE` from the deployment after bootstrapping. The database trigger enforces a maximum of 3 active admins and 8 active renters. The `bills` table prevents duplicate electricity, WiFi, water, or rent bills in one billing period.

## Data and payment rules

- Bills require a type, title, amount, start date, due date, and optional notes or source image.
- Renters select stay dates and submit one payment per bill with an optional image receipt.
- Admins can review members, bills, payment status, notes, and receipt paths.
- Electricity, WiFi, and water collection is tracked separately from rent.
- Personal shares are divided by the active renter count. A production calculation service should replace the local prototype calculation with the agreed electricity/day-stay formula.
- Every admin mutation is written to `audit_log`.

## Security requirements

- Use Supabase Auth for designated account passwords; do not use the localStorage demo accounts in a public deployment.
- Keep service-role credentials server-side only and rotate the admin invite code after bootstrap.
- Use private Supabase Storage for receipts. Do not make payment images public.
- Require email confirmation, strong passwords, and rate limiting before launch.
- Configure the production HTTPS domain.
- Review RLS policies whenever a new table or endpoint is added.
- Add a payment review workflow before treating a submitted receipt as approved.

The browser-only fallback is intentionally useful for local design work, but the Vercel/Supabase path is the one to use for shared, persistent household data.
