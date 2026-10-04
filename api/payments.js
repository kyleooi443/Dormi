const { getSupabaseAdmin, requireUser } = require("./_lib/supabase");
const { sendJson, methodNotAllowed } = require("./_lib/http");

module.exports = async function payments(request, response) {
  if (request.method !== "POST") return methodNotAllowed(response, ["POST"]);
  const auth = await requireUser(request);
  if (auth.error) return sendJson(response, auth.status, { error: auth.error });
  const { billId, amount, paidOn, receiptPath, note } = request.body || {};
  if (!billId || !amount || !paidOn) return sendJson(response, 400, { error: "Bill, amount, and payment date are required." });
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("payments").insert({ bill_id: billId, renter_id: auth.user.id, amount, paid_on: paidOn, receipt_path: receiptPath || null, note: note || null }).select().single();
  if (error) return sendJson(response, 400, { error: error.message });
  return sendJson(response, 201, { payment: data });
};
