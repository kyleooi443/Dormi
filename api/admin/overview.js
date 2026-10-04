const { getSupabaseAdmin, requireUser } = require("../_lib/supabase");
const { sendJson, methodNotAllowed } = require("../_lib/http");

module.exports = async function overview(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  const auth = await requireUser(request);
  if (auth.error) return sendJson(response, auth.status, { error: auth.error });
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from("profiles").select("household_id, role").eq("id", auth.user.id).single();
  if (!profile || profile.role !== "admin") return sendJson(response, 403, { error: "Admin access required." });
  const [members, bills, payments] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, email, role, active, created_at").eq("household_id", profile.household_id).order("created_at"),
    supabase.from("bills").select("id, billing_period_id, type, title, amount, started_on, due_on, notes, source_image_path").eq("household_id", profile.household_id).order("due_on", { ascending: false }),
    supabase.from("payments").select("id, bill_id, renter_id, amount, paid_on, status, receipt_path, note, created_at").in("bill_id", (await supabase.from("bills").select("id").eq("household_id", profile.household_id)).data?.map((bill) => bill.id) || []),
  ]);
  if (members.error || bills.error || payments.error) return sendJson(response, 500, { error: "Unable to load admin overview." });
  return sendJson(response, 200, { members: members.data, bills: bills.data, payments: payments.data });
};
