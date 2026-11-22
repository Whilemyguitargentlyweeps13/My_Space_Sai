const { getSupabaseRestUrl } = require("../lib/supabase");

module.exports = function adminConfig(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const config = getSupabaseRestUrl("projects");
  if (!config) return response.status(503).json({ error: "Supabase is not configured" });

  return response.status(200).json({
    supabaseUrl: config.endpoint.origin,
    publishableKey: config.publishableKey,
  });
};
