function sendJson(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json").send(JSON.stringify(body));
}

function methodNotAllowed(response, methods) {
  response.setHeader("Allow", methods.join(", "));
  sendJson(response, 405, { error: "Method not allowed" });
}

module.exports = { sendJson, methodNotAllowed };
