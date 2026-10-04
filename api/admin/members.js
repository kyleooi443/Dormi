const { getSupabaseAdmin, requireUser } = require("../_lib/supabase");
const { sendJson, methodNotAllowed } = require("../_lib/http");

module.exports = async function adminMembers(request, response) {
  if (request.method !== "PATCH") return methodNotAllowed(response, ["PATCH"]);
  const auth = await requireUser(request);
  if (auth.error) return sendJson(response, auth.status, { error: auth.error });
  const supabase = getSupabaseAdmin();
  const { data: profile } = await supabase.from("profiles").select("id, household_id, role").eq("id", auth.user.id).single();
  if (!profile || profile.role !== "admin") return sendJson(response, 403, { error: "Admin access required." });
  const { memberId, active, fullName } = request.body || {};
  if (!memberId || (active == null && !fullName)) return sendJson(response, 400, { error: "A member and an update are required." });
  const updates = {};
  if (active != null) updates.active = Boolean(active);
  if (fullName) updates.full_name = String(fullName).trim();
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", memberId).eq("household_id", profile.household_id).select().single();
  if (error) return sendJson(response, 400, { error: error.message });
  await supabase.from("audit_log").insert({ household_id: profile.household_id, actor_id: profile.id, action: "updated", entity_type: "profile", entity_id: memberId, metadata: updates });
  return sendJson(response, 200, { member: data });
};
