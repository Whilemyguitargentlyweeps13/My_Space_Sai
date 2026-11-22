module.exports = async function articles(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const projectUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!projectUrl || !publishableKey) {
    return response.status(503).json({ error: "Supabase is not configured" });
  }

  const endpoint = new URL("/rest/v1/articles", projectUrl);
  endpoint.searchParams.set("select", "slug,title,category,intro,content,published_at,created_at,cover_url");
  endpoint.searchParams.set("is_published", "eq.true");
  endpoint.searchParams.set("order", "published_at.desc.nullslast,created_at.desc");

  try {
    const upstream = await fetch(endpoint, {
      headers: { apikey: publishableKey, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      console.error("Supabase articles read failed:", upstream.status);
      return response.status(502).json({ error: "Could not load journal entries" });
    }

    const rows = await upstream.json();
    const entries = rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      category: row.category,
      intro: row.intro,
      blocks: row.content || [],
      date: (row.published_at || row.created_at || "").slice(0, 10),
      coverImage: row.cover_url,
    }));
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response.status(200).json(entries);
  } catch (error) {
    console.error("Supabase articles request failed:", error?.name || "Unknown error");
    return response.status(502).json({ error: "Could not load journal entries" });
  }
};
