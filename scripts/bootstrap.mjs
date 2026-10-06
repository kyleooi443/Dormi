#!/usr/bin/env node
/*
 * One-time account bootstrap for UDH-304.
 *
 * Creates the fixed household accounts (admin + tenant1..tenant7) in Supabase
 * Auth and inserts their profiles. Run it locally with the service-role key —
 * the app itself never sees that key.
 *
 * Usage:
 *   1. cp .env.example .env and fill in SUPABASE_SERVICE_ROLE_KEY + passwords
 *   2. npm run bootstrap
 *
 * Safe to re-run: existing accounts are skipped.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Minimal .env loader (no dependency).
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, UDH_ADMIN_PASSWORD } = process.env;
// The app uses EXPO_PUBLIC_* names; accept either.
const supabaseUrl = SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!supabaseUrl || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing EXPO_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const accounts = [
  { username: "admin", role: "admin", fullName: "Admin", password: UDH_ADMIN_PASSWORD },
  ...Array.from({ length: 7 }, (_, index) => ({
    username: `tenant${index + 1}`,
    role: "renter",
    fullName: `Tenant ${index + 1}`,
    password: process.env[`UDH_TENANT_${index + 1}_PASSWORD`],
  })),
];

const weak = accounts.filter((account) => !account.password || account.password.length < 8);
if (weak.length) {
  console.error(`Every account needs a password of at least 8 characters. Missing/short: ${weak.map((a) => a.username).join(", ")}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: household, error: householdError } = await supabase.from("households").select("id").eq("code", "UDH-304").single();
if (householdError || !household) {
  console.error(`Household UDH-304 not found — run supabase/schema.sql first. (${householdError?.message ?? "no row"})`);
  process.exit(1);
}

for (const account of accounts) {
  const email = `${account.username}@udh304.local`;
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password: account.password,
    email_confirm: true,
  });

  if (userError) {
    if (/already|exists|registered/i.test(userError.message)) {
      console.log(`• ${account.username} already exists, skipping`);
      continue;
    }
    console.error(`✗ ${account.username}: ${userError.message}`);
    process.exit(1);
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userData.user.id,
    household_id: household.id,
    username: account.username,
    full_name: account.fullName,
    email,
    role: account.role,
  });
  if (profileError) {
    console.error(`✗ ${account.username} profile: ${profileError.message}`);
    process.exit(1);
  }
  console.log(`✓ ${account.username} (${account.role})`);
}

// Create a starter billing period for the current month if none exists yet.
const { data: existingPeriods } = await supabase.from("billing_periods").select("id").eq("household_id", household.id).limit(1);
if (!existingPeriods?.length) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const startsOn = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  const endsOn = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}`;
  const dueOn = `${now.getFullYear()}-${pad(now.getMonth() + 2)}-05`;
  const label = startsOn;
  const adminProfile = (await supabase.from("profiles").select("id").eq("username", "admin").single()).data;
  const { error: periodError } = await supabase.from("billing_periods").insert({
    household_id: household.id,
    label: new Date(startsOn).toLocaleDateString("en-US", { month: "long", year: "numeric" }) || label,
    starts_on: startsOn,
    ends_on: endsOn,
    due_on: dueOn,
    created_by: adminProfile.id,
  });
  if (periodError) console.warn(`! starter billing period: ${periodError.message}`);
  else console.log("✓ starter billing period created");
}

console.log("\nDone. Sign in as `admin` with UDH_ADMIN_PASSWORD and hand the tenant passwords to your housemates.");
