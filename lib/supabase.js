function getSupabaseRestUrl(table) {
  const rawUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!rawUrl || !publishableKey?.startsWith("sb_publishable_")) return null;

  let projectUrl;
  try {
    projectUrl = new URL(rawUrl);
  } catch {
    return null;
  }

  if (
    projectUrl.protocol !== "https:" ||
    !projectUrl.hostname.endsWith(".supabase.co") ||
    projectUrl.username ||
    projectUrl.password ||
    projectUrl.port
  ) {
    return null;
  }

  return {
    endpoint: new URL(`/rest/v1/${table}`, projectUrl),
    publishableKey,
  };
}

module.exports = { getSupabaseRestUrl };
