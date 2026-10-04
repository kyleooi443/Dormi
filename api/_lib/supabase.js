const { createClient } = require("@supabase/supabase-js");

function getSupabaseAdmin() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server environment variables are missing.");
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getSupabasePublic() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase public environment variables are missing.");
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

async function requireUser(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Missing bearer token", status: 401 };
  const { data, error } = await getSupabasePublic().auth.getUser(token);
  if (error || !data.user) return { error: "Invalid session", status: 401 };
  return { user: data.user };
}

module.exports = { getSupabaseAdmin, getSupabasePublic, requireUser };
