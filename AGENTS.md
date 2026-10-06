# UDH-304 Dorm Payments — project memory for OpenCode

Shared dorm payment app for one household (max 3 admins, 8 renters). Students
manage their own bills; admins review payments. Mobile-first, but must work on
web/desktop too.

## Stack

- **Expo SDK 57** (React Native 0.86 + TypeScript, Expo Router, new arch)
- **Supabase** (Auth + Postgres + private Storage bucket `payment-receipts`)
  accessed **directly from the app** — there is no server layer. RLS policies
  are the only permission system; the service-role key must never reach the
  app or Vercel.
- Web output is a single-page app (`web.output: "single"` in `app.json`).

## Commands

- `npm start` — dev server (web at localhost:8081, Expo Go for devices)
- `npm run typecheck` — always run after TypeScript changes (`tsc --noEmit`)
- `npm run bootstrap` — one-time creation of the 8 accounts (`admin`,
  `tenant1`–`tenant7`, emails `*@udh304.local`) from `.env` passwords

## Auth model

- Username + password only (no Google/OAuth, no sign-ups). The app maps
  `username` → `username@udh304.local` for Supabase password sign-in.
- Accounts with missing/deactivated profiles are signed out immediately.

## Money rules

- One bill per type (electricity/wifi/water/rent) per billing period
  (`unique(billing_period_id, type)`); one payment per renter per bill.
- **Shares**: utilities are prorated by stay days
  (`amount × my days ÷ household stay days`, renters only — admins are
  excluded); rent splits equally; equal-split fallback when no stay days are
  recorded. Logic: `src/lib/shares.ts` + the `stay_day_total()` DB function.
- Payments are `submitted` until an admin approves/rejects them.

## Layout

- `app/` — routes: `login`, `(tabs)` (index/bills/activity/admin), `modal/*`
- `src/lib/` — supabase client, auth/household/toast/theme providers, api
  helpers, `shares.ts`, `report.ts` (CSV + chat summary export)
- `src/components/` — `ui.tsx` primitives (always use them; never one-off
  buttons/cards), `BarChart`, `CalendarPicker`

## Design conventions

- Palette in `src/lib/theme.tsx` (forest #1d5346 / forest-dark #173d35 / mint
  #d9eee3 / coral #ed8d6f); support light AND dark mode for every screen.
- Fonts: Space Grotesk (headings), DM Sans (body) via @expo-google-fonts.
- Icons: **@expo/vector-icons Ionicons only — never emojis/text glyphs** for
  structural icons. Bottom tab bar is a floating frosted-glass BlurView; tab
  screens must use `<Screen clearTabBar>`.

## Supabase project

- Ref `uguyfdvqhztvtljumxat` (`https://uguyfdvqhztvtljumxat.supabase.co`).
- **Migrations are applied manually** by pasting into the SQL editor —
  `supabase/migrations/` files do NOT auto-run. When adding one, tell the user
  to run it (copying to clipboard with `pbcopy` worked well).
- Schema in `supabase/schema.sql`; keep it in sync with migrations.

## Deployment (Vercel project `dormi`, repo `kyleooi443/Dormi`)

- Production: https://dormi-chi.vercel.app (long `dormi-*-abcd-3b01.vercel.app`
  deployment URLs are SSO-protected — always share the short alias).
- `vercel.json` builds with `npx expo export --platform web` → `dist`.
- Only env vars in Vercel: `EXPO_PUBLIC_SUPABASE_URL`,
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **Gotcha that bit us once**: `EXPO_PUBLIC_SUPABASE_URL` must be the bare
  origin — if it ends in `/rest/v1/`, auth 404s and the app wrongly reports
  "Username or password is incorrect".
- Env var changes require a redeploy (they are inlined at build time).

## Secrets

- `.env` (gitignored) holds the anon key, service-role key, and the 8 account
  passwords. Never commit it, print it, or put any of it in Vercel beyond the
  two `EXPO_PUBLIC_*` vars.
