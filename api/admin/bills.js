const { getSupabaseAdmin, requireUser } = require("../_lib/supabase");
const { sendJson, methodNotAllowed } = require("../_lib/http");

module.exports = async function adminBills(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const auth = await requireUser(request);
  if (auth.error) return sendJson(response, auth.status, { error: auth.error });
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from("profiles").select("id, household_id, role").eq("id", auth.user.id).single();
  if (!profile || profile.role !== "admin") return sendJson(response, 403, { error: "Admin access required." });
  const { billingPeriodId, type, title, amount, startedOn, dueOn, notes, sourceImagePath } = request.body || {};
  if (!billingPeriodId || !type || !title || amount == null || !startedOn || !dueOn) return sendJson(response, 400, { error: "Bill type, title, amount, start date, and due date are required." });
  const { data, error } = await supabase.from("bills").insert({ household_id: profile.household_id, billing_period_id: billingPeriodId, type, title, amount, started_on: startedOn, due_on: dueOn, notes: notes || null, source_image_path: sourceImagePath || null, created_by: profile.id }).select().single();
  if (error) return sendJson(response, 400, { error: error.message });
  await supabase.from("audit_log").insert({ household_id: profile.household_id, actor_id: profile.id, action: "created", entity_type: "bill", entity_id: data.id, metadata: { type, amount } });
  return sendJson(response, 201, { bill: data });
};
