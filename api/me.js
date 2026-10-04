const { getSupabaseAdmin, requireUser } = require("./_lib/supabase");
const { sendJson, methodNotAllowed } = require("./_lib/http");

/*
 * Returns the signed-in user's household profile.
 * Method: GET
 * Body: none
 */
module.exports = async function me(request, response) {
  if (request.method !== "GET") return methodNotAllowed(response, ["GET"]);
  const auth = await requireUser(request);
  if (auth.error) return sendJson(response, auth.status, { error: auth.error });
  const { data, error } = await getSupabaseAdmin().from("profiles").select("id, household_id, username, full_name, email, role, active").eq("id", auth.user.id).single();
  if (error) return sendJson(response, 404, { error: "Profile not found." });
  return sendJson(response, 200, { profile: data });
};
