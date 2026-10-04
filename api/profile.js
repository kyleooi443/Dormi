const { getSupabaseAdmin, requireUser } = require("./_lib/supabase");
const { sendJson, methodNotAllowed } = require("./_lib/http");

/*
 * Updates the signed-in user's display name.
 * Method: PATCH
 * Body: { fullName }
 */
module.exports = async function profile(request, response) {
  if (request.method !== "PATCH") return methodNotAllowed(response, ["PATCH"]);
  const auth = await requireUser(request);
  if (auth.error) return sendJson(response, auth.status, { error: auth.error });
  const fullName = String(request.body?.fullName || "").trim();
  if (fullName.length < 2 || fullName.length > 120) return sendJson(response, 400, { error: "Full name must be between 2 and 120 characters." });

  const { data, error } = await getSupabaseAdmin()
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", auth.user.id)
    .select("id, household_id, username, full_name, email, role, active")
    .single();
  if (error) return sendJson(response, 400, { error: error.message });
  return sendJson(response, 200, { profile: data });
};
