const { getSupabaseAdmin } = require("../_lib/supabase");
const { sendJson, methodNotAllowed } = require("../_lib/http");

/*
 * Creates the initial designated household accounts from server-only environment variables.
 * Method: POST
 * Body: none; send the one-time secret in the x-bootstrap-code header.
 */
module.exports = async function bootstrap(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  if (!process.env.UDH_BOOTSTRAP_CODE || request.headers["x-bootstrap-code"] !== process.env.UDH_BOOTSTRAP_CODE) {
    return sendJson(response, 403, { error: "Invalid bootstrap code." });
  }

  const accounts = [
    { username: "admin", role: "admin", fullName: "Admin", password: process.env.UDH_ADMIN_PASSWORD },
    ...Array.from({ length: 7 }, (_, index) => ({
      username: `tenant${index + 1}`,
      role: "renter",
      fullName: `Tenant ${index + 1}`,
      password: process.env[`UDH_TENANT_${index + 1}_PASSWORD`],
    })),
  ];
  if (accounts.some((account) => !account.password || account.password.length < 8)) {
    return sendJson(response, 500, { error: "All designated account passwords must be configured with at least 8 characters." });
  }

  const supabase = getSupabaseAdmin();
  const { data: household, error: householdError } = await supabase.from("households").select("id").eq("code", "UDH-304").single();
  if (householdError) return sendJson(response, 500, { error: householdError.message });

  const created = [];
  for (const account of accounts) {
    const email = `${account.username}@udh304.local`;
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: account.password,
      email_confirm: true,
    });
    if (userError) return sendJson(response, 400, { error: `Unable to create ${account.username}: ${userError.message}` });

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userData.user.id,
      household_id: household.id,
      username: account.username,
      full_name: account.fullName,
      email,
      role: account.role,
    });
    if (profileError) {
      await supabase.auth.admin.deleteUser(userData.user.id);
      return sendJson(response, 400, { error: `Unable to create ${account.username} profile: ${profileError.message}` });
    }
    created.push(account.username);
  }

  return sendJson(response, 201, { accounts: created });
};
