const { getSupabaseAdmin, requireUser } = require("../_lib/supabase");
const { sendJson, methodNotAllowed } = require("../_lib/http");

module.exports = async function receiptUpload(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const auth = await requireUser(request);
  if (auth.error) return sendJson(response, auth.status, { error: auth.error });
  const { fileName, contentType } = request.body || {};
  if (!fileName || !contentType?.startsWith("image/")) return sendJson(response, 400, { error: "An image receipt is required." });
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${auth.user.id}/${crypto.randomUUID()}-${safeName}`;
  const { data, error } = await getSupabaseAdmin().storage.from("payment-receipts").createSignedUploadUrl(path);
  if (error) return sendJson(response, 500, { error: error.message });
  return sendJson(response, 200, { path, token: data.token });
};
