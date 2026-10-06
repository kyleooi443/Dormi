# UDH-304 Dorm Payments

![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-4630EB?style=flat-square&logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?style=flat-square&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth%20%2B%20Storage-3ECF8E?style=flat-square&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

A private, mobile-first shared-housing payment app for one household of up to **3 admins** and **8 renters**. Admins open billing periods and record bills; renters see exactly what they owe (transparent, day-stay prorated) and submit payments with receipt photos.

Built with **Expo (React Native + TypeScript)** for iOS, Android, and web. The app talks **directly to Supabase** — no server layer. Every permission is enforced by Postgres Row-Level Security.

---

## Screenshots

| Desktop Dashboard | Mobile Dashboard | Bills (Countdown Chips) | Admin Report |
|---|---|---|---|
| ![Desktop](screenshots/02-dashboard-desktop.png) | ![Mobile](screenshots/03-dashboard-mobile.png) | ![Bills](screenshots/06-bills-countdown.png) | ![Admin](screenshots/07-admin-report.png) |

| Login — Desktop | Login — Mobile | Floating Glass Tab Bar | Production |
|---|---|---|---|
| ![Login D](screenshots/01-login-desktop.png) | ![Login M](screenshots/09-tenant1-login.png) | ![Tab Bar](screenshots/05-glass-tabbar-mobile.png) | ![Prod](screenshots/08-production.png) |

---

## What it does

### For renters
- See the current billing period and your **personal share** of every bill
- Transparent breakdown: electricity/wifi/water are prorated by your stay days; rent splits equally
- Pick your exact stay dates on an interactive calendar
- Submit one payment per bill with an optional receipt photo
- Track due dates with countdown chips (Due today / Due in 3d / Overdue 2d)

### For admins
- Create billing periods (label, start/end dates, due date)
- Add one bill per type (electricity, WiFi, water, rent) per period
- Review, approve, or reject payments; view receipts via short-lived signed URLs
- Toggle member access (activate/deactivate)
- Export a period report — chat-ready summary or full CSV
- View quarter spending chart and household activity feed

### House rules
- **Electricity / WiFi / Water**: prorated by stay days — `amount × my days ÷ household stay days` (renters only; admins excluded)
- **Rent**: always split equally among active renters
- **Fallback**: if no stay days are recorded, utilities split equally too
- One bill per type per period; one payment per renter per bill
- Payments are `submitted` until an admin approves or rejects them

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Expo App (iOS/Android/Web)           │
│  React Native 0.86  ·  TypeScript  ·  Expo Router       │
│                                                         │
│  Providers: Theme → Toast → Auth → Household            │
│  Screens:  login · (tabs) · modal/*                     │
│  Components: ui.tsx primitives · BarChart · Calendar    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │  supabase-js (anon key + user JWT)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase (Postgres)                  │
│  Auth  ·  Tables  ·  RLS policies  ·  Storage buckets   │
│  Triggers: capacity guard, column-protection            │
│  Functions: stay_day_total(), current_profile()         │
└─────────────────────────────────────────────────────────┘
```

**No backend server.** The front end calls Supabase directly. RLS is the only permission system. The service-role key exists only in the local bootstrap script — it never reaches the app or Vercel.

**Web output** is a static single-page app (`expo export --platform web` → `dist/`) deployed to Vercel. Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are inlined at build time.

---

## Project structure

```
udh 304/
├─ app/
│  ├─ _layout.tsx              # Root: fonts, splash, provider stack
│  ├─ index.tsx                # Redirect based on auth state
│  ├─ login.tsx                # Username + password sign-in
│  ├─ (tabs)/
│  │  ├─ _layout.tsx           # Floating BlurView tab bar
│  │  ├─ index.tsx             # Overview dashboard
│  │  ├─ bills.tsx             # Bill list + payment cards
│  │  ├─ activity.tsx          # Household activity feed
│  │  └─ admin.tsx             # Admin tools (admin-only)
│  └─ modal/
│     ├─ add-bill.tsx          # Create a bill
│     ├─ pay-bill.tsx          # Submit payment + receipt
│     ├─ stay-dates.tsx        # Calendar date picker
│     ├─ edit-profile.tsx      # Update display name
│     └─ periods.tsx           # Switch / create billing periods
├─ src/
│  ├─ lib/
│  │  ├─ supabase.ts           # Public client (anon key, RLS-guarded)
│  │  ├─ auth.tsx              # Session + profile context
│  │  ├─ household.tsx         # Periods / members / bills context
│  │  ├─ api.ts                # Typed Supabase helpers
│  │  ├─ shares.ts             # Share proration math
│  │  ├─ types.ts              # TypeScript models
│  │  ├─ format.ts             # Peso / date / countdown formatting
│  │  ├─ report.ts             # CSV + chat summary export
│  │  ├─ useStayDays.ts        # Stay-day counts hook
│  │  ├─ theme.tsx             # Light/dark palette + fonts
│  │  └─ toast.tsx             # Transient toast messages
│  └─ components/
│     ├─ ui.tsx                # Screen, Card, Button, Field, Pill, etc.
│     ├─ BarChart.tsx          # Paired bar chart (total vs. share)
│     └─ CalendarPicker.tsx    # Tappable month calendar
├─ scripts/
│  └─ bootstrap.mjs            # One-time 8-account creation
├─ supabase/
│  ├─ schema.sql               # Full DDL: tables, triggers, RLS, bucket
│  └─ migrations/              # Incremental migrations
├─ vercel.json                 # Static export config + headers
└─ AGENTS.md                   # AI agent memory for this repo
```

---

## Getting started

### Prerequisites
- Node.js 20+
- Supabase project (free tier works)
- Expo Go (optional, for device testing)

### Setup

```bash
git clone <repo> && cd "udh 304"
npm install
cp .env.example .env
```

Fill `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Bootstrap only — never ship these:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=...
TENANT1_PASSWORD=...
# ... through TENANT7_PASSWORD
```

> **Gotcha:** `EXPO_PUBLIC_SUPABASE_URL` must be the bare origin (`https://xxx.supabase.co`). If it ends in `/rest/v1/`, auth calls 404 and the app wrongly says "Username or password is incorrect".

### Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Run any unrun migrations in `supabase/migrations/` in date order:
   - `20261004_designated_accounts.sql`
   - `20261006_direct_client_access.sql`
   - `20261007_stay_day_shares.sql`
4. Enable **Email** auth (Authentication → Providers). No OAuth.
5. Add the service-role key and 8 passwords to `.env`, then:

```bash
npm run bootstrap
```

This creates `admin` + `tenant1`–`tenant7` (emails `*@udh304.local`) plus a starter billing period.

### Run

```bash
npm start          # Press w (web), i (iOS), a (Android)
```

Type-check before shipping:

```bash
npm run typecheck
```

---

## Deployment (Vercel)

```bash
npx expo export --platform web   # → dist/
```

Vercel project settings:
- **Build command:** `npx expo export --platform web`
- **Output directory:** `dist`
- **Env vars:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Env var changes require a redeploy (values are inlined at build time).

Production alias: **https://dormi-chi.vercel.app**

Long `dormi-*-abcd-3b01.vercel.app` URLs are SSO-protected — always share the short alias.

---

## Security notes

- The **anon key is safe to embed** — RLS guards every table.
- The **service-role key** lives only in `.env` for bootstrap; never commit it, never add it to Vercel.
- Receipts are in a **private** bucket; access is via 120-second signed URLs, owner + admins only.
- Every admin mutation is written to `audit_log`.
- A database trigger caps the household at 3 admins and 8 active renters.
- Deactivating a member never fails because of capacity (trigger skips inactive rows).
- Non-admins cannot change `role`, `active`, `household_id`, `username`, or `email` (DB trigger enforces this).

---

## Data & RLS summary

| Table | Renter can... | Admin can... |
|---|---|---|
| `households` | Read own | Read own |
| `profiles` | Read household, update own full name | Full CRUD |
| `billing_periods` | Read household | Full CRUD |
| `bills` | Read household | Full CRUD |
| `stay_dates` | Read/write own | Read all in household |
| `payments` | Read own, insert own | Full CRUD |
| `audit_log` | — | Read + insert |
| `payment-receipts` bucket | Upload/read own folder | Read any |

---

## Contributing

- Follow the existing structure: `app/` routes, `src/lib/` logic, `src/components/` UI.
- Always use the `ui.tsx` primitives — never one-off buttons/cards.
- Icons: **@expo/vector-icons Ionicons only** — no emojis or text glyphs.
- Every screen must support **light AND dark** mode via `useTheme()`.
- Bottom tab bar is a floating BlurView; tab screens must use `<Screen clearTabBar>`.
- Run `npm run typecheck` before pushing.

---

## License

MIT — see [LICENSE](LICENSE).
