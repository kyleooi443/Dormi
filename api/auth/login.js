const { getSupabasePublic } = require("../_lib/supabase");
const { sendJson, methodNotAllowed } = require("../_lib/http");

/*
 * Signs in a designated household account.
 * Method: POST
 * Body: { username, password }
 */
module.exports = async function login(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const { username, password } = request.body || {};
  if (!username || !password) return sendJson(response, 400, { error: "Username and password are required." });
  const email = `${String(username).trim().toLowerCase()}@udh304.local`;
  const { data, error } = await getSupabasePublic().auth.signInWithPassword({ email, password });
  if (error) return sendJson(response, 401, { error: "Email or password is incorrect." });
  return sendJson(response, 200, { accessToken: data.session.access_token, refreshToken: data.session.refresh_token, user: data.user, username: String(username).trim().toLowerCase() });
};
