import { Platform } from "react-native";

import { supabase } from "./supabase";
import type { BillingPeriod, Bill, BillType, Payment, PaymentStatus, Profile, StayDate } from "./types";

/**
 * API helpers — thin typed wrappers over supabase-js.
 * Every query is scoped by RLS; helpers just unwrap errors and cast types.
 */
const RECEIPT_BUCKET = "payment-receipts";

export async function fetchMembers(): Promise<Profile[]> {
  /** RLS scopes this to the caller's own household. */
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function fetchPeriods(): Promise<BillingPeriod[]> {
  const { data, error } = await supabase.from("billing_periods").select("*").order("starts_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BillingPeriod[];
}

export async function createPeriod(
  householdId: string,
  createdBy: string,
  input: { label: string; starts_on: string; ends_on: string; due_on: string }
): Promise<BillingPeriod> {
  const { data, error } = await supabase
    .from("billing_periods")
    .insert({ household_id: householdId, created_by: createdBy, ...input })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BillingPeriod;
}

/** Every bill in the household (all periods). RLS keeps it household-scoped. */
export async function fetchAllBills(): Promise<Bill[]> {
  const { data, error } = await supabase.from("bills").select("*").order("due_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Bill[];
}

export async function createBill(
  householdId: string,
  createdBy: string,
  input: {
    billing_period_id: string;
    type: BillType;
    title: string;
    amount: number;
    started_on: string;
    due_on: string;
    notes?: string | null;
  }
): Promise<Bill> {
  const { data, error } = await supabase
    .from("bills")
    .insert({
      household_id: householdId,
      created_by: createdBy,
      billing_period_id: input.billing_period_id,
      type: input.type,
      title: input.title,
      amount: input.amount,
      started_on: input.started_on,
      due_on: input.due_on,
      notes: input.notes || null,
    })
    .select()
    .single();
  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      throw new Error(`A ${input.type} bill already exists for this period.`);
    }
    throw new Error(error.message);
  }
  await logAudit(householdId, createdBy, "created", "bill", (data as Bill).id, { type: input.type, amount: input.amount });
  return data as Bill;
}

/** Payments the caller is allowed to see (own for renters, all for admins). */
export async function fetchPayments(billIds: string[]): Promise<Payment[]> {
  if (!billIds.length) return [];
  const { data, error } = await supabase.from("payments").select("*").in("bill_id", billIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

export async function submitPayment(input: {
  bill_id: string;
  renter_id: string;
  amount: number;
  paid_on: string;
  note?: string | null;
  receipt_path?: string | null;
}): Promise<Payment> {
  const { data, error } = await supabase
    .from("payments")
    .insert({ bill_id: input.bill_id, renter_id: input.renter_id, amount: input.amount, paid_on: input.paid_on, note: input.note || null, receipt_path: input.receipt_path || null })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("You have already submitted a payment for this bill.");
    throw new Error(error.message);
  }
  return data as Payment;
}

export async function reviewPayment(
  householdId: string,
  reviewerId: string,
  paymentId: string,
  status: Extract<PaymentStatus, "approved" | "rejected">
): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
  await logAudit(householdId, reviewerId, status, "payment", paymentId, {});
}

export async function setMemberActive(householdId: string, actorId: string, memberId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("profiles").update({ active }).eq("id", memberId);
  if (error) throw new Error(error.message);
  await logAudit(householdId, actorId, active ? "reactivated" : "deactivated", "profile", memberId, {});
}

export async function updateFullName(userId: string, fullName: string): Promise<Profile> {
  const trimmed = fullName.trim();
  if (trimmed.length < 2 || trimmed.length > 120) throw new Error("Full name must be between 2 and 120 characters.");
  const { data, error } = await supabase.from("profiles").update({ full_name: trimmed }).eq("id", userId).select().single();
  if (error) throw new Error(error.message);
  return data as Profile;
}

export async function fetchStayDates(periodId: string): Promise<StayDate[]> {
  const { data, error } = await supabase.from("stay_dates").select("*").eq("billing_period_id", periodId);
  if (error) throw new Error(error.message);
  return (data ?? []) as StayDate[];
}

/** Household-wide stay-day total for a period (active renters only, admins excluded). */
export async function fetchStayDayTotal(periodId: string): Promise<number> {
  const { data, error } = await supabase.rpc("stay_day_total", { p_billing_period_id: periodId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Replace the caller's stay dates for a period with the newly selected set. */
export async function saveStayDates(periodId: string, renterId: string, dates: string[]): Promise<void> {
  const { error: removeError } = await supabase
    .from("stay_dates")
    .delete()
    .eq("billing_period_id", periodId)
    .eq("renter_id", renterId);
  if (removeError) throw new Error(removeError.message);
  if (!dates.length) return;
  const { error } = await supabase
    .from("stay_dates")
    .insert(dates.map((stay_date) => ({ billing_period_id: periodId, renter_id: renterId, stay_date })));
  if (error) throw new Error(error.message);
}

export interface ReceiptFile {
  uri: string;
  fileName: string;
  mimeType: string;
}

/** Uploads a receipt image into the caller's own folder of the private bucket. */
export async function uploadReceipt(userId: string, file: ReceiptFile): Promise<string> {
  const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${crypto.randomUUID()}-${safeName}`;

  if (Platform.OS === "web") {
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, blob, { contentType: file.mimeType });
    if (error) throw new Error(error.message);
  } else {
    const formData = new FormData();
    formData.append("file", { uri: file.uri, name: safeName, type: file.mimeType } as unknown as Blob);
    const { error } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, formData, { contentType: file.mimeType });
    if (error) throw new Error(error.message);
  }
  return path;
}

/** Short-lived signed URL so owners and admins can view a private receipt. */
export async function getReceiptUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 120);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

async function logAudit(
  householdId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  // Audit failures should never block the action that already succeeded.
  await supabase
    .from("audit_log")
    .insert({ household_id: householdId, actor_id: actorId, action, entity_type: entityType, entity_id: entityId, metadata })
    .then(({ error }) => {
      if (error) console.warn("audit_log insert failed:", error.message);
    });
}
