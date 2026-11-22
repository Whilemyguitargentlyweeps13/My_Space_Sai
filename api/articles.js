const { getSupabaseRestUrl } = require("../lib/supabase");
const asText = (value, max = 10000) =>
  typeof value === "string" ? value.slice(0, max) : "";

function normalizeBlock(block) {
  if (!block || typeof block !== "object" || Array.isArray(block)) return null;
  if (["heading", "paragraph"].includes(block.type)) {
    return { type: block.type, text: asText(block.text, block.type === "heading" ? 240 : 10000) };
  }
  if (block.type === "rich") return { type: "rich", html: asText(block.html, 20000) };
  if (block.type === "code") return { type: "code", code: asText(block.code, 20000) };
  if (block.type === "list") {
    return {
      type: "list",
      items: Array.isArray(block.items)
        ? block.items
            .filter((item) => typeof item === "string")
            .slice(0, 100)
            .map((item) => item.slice(0, 2000))
        : [],
    };
  }
  if (block.type === "image") {
    let src = "";
    try {
      const url = new URL(block.src);
      const allowedHost = url.hostname.endsWith(".supabase.co") || url.hostname === "raw.githubusercontent.com";
      if (url.protocol === "https:" && allowedHost) src = url.href;
    } catch {}
    return src ? { type: "image", src, alt: asText(block.alt, 500), caption: asText(block.caption, 1000) } : null;
  }
  if (block.type === "video") {
    let src = "";
    try {
      const url = new URL(block.src);
      if (url.protocol === "https:" && url.hostname.endsWith(".supabase.co")) src = url.href;
    } catch {}
    return src ? { type: "video", src, caption: asText(block.caption, 1000) } : null;
  }
  if (block.type === "table") {
    const headers = Array.isArray(block.headers)
      ? block.headers
          .filter((cell) => typeof cell === "string")
          .slice(0, 20)
          .map((cell) => cell.slice(0, 300))
      : [];
    const rows = Array.isArray(block.rows)
      ? block.rows
          .slice(0, 100)
          .map((row) =>
            Array.isArray(row) ? row.slice(0, 20).map((cell) => asText(cell, 1000)) : [],
          )
      : [];
    return { type: "table", headers, rows };
  }
  return null;
}

function normalizeDate(value) {
  if (typeof value !== "string") return "";
  return value.slice(0, 10);
}

function normalizeCoverUrl(value) {
  try {
    const url = new URL(value);
    const allowedHost = url.hostname.endsWith(".supabase.co") || url.hostname === "raw.githubusercontent.com";
    return url.protocol === "https:" && allowedHost ? url.href : null;
  } catch {
    return null;
  }
}

module.exports = async function articles(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const config = getSupabaseRestUrl("articles");
  if (!config) {
    return response.status(503).json({ error: "Supabase is not configured" });
  }

  const { endpoint, publishableKey } = config;
  endpoint.searchParams.set("select", "slug,title,category,intro,content,published_at,created_at,cover_url");
  endpoint.searchParams.set("is_published", "eq.true");
  endpoint.searchParams.set("order", "published_at.desc.nullslast,created_at.desc");
  endpoint.searchParams.set("limit", "100");

  try {
    const upstream = await fetch(endpoint, {
      headers: { apikey: publishableKey, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      console.error("Supabase articles read failed:", upstream.status);
      return response.status(502).json({ error: "Could not load journal entries" });
    }

    const body = await upstream.text();
    if (Buffer.byteLength(body, "utf8") > 1_000_000) {
      return response.status(502).json({ error: "Journal data is too large" });
    }
    const rows = JSON.parse(body);
    if (!Array.isArray(rows)) throw new Error("Unexpected Supabase response");
    const entries = rows
      .filter(
        (row) =>
          row &&
          typeof row === "object" &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug || "") &&
          typeof row.title === "string",
      )
      .map((row) => ({
        slug: asText(row.slug, 120),
        title: asText(row.title, 240),
        category: asText(row.category, 100),
        intro: asText(row.intro, 4000),
        blocks: Array.isArray(row.content) ? row.content.slice(0, 300).map(normalizeBlock).filter(Boolean) : [],
        date: normalizeDate(row.published_at || row.created_at),
        coverImage: normalizeCoverUrl(row.cover_url),
      }));
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response.status(200).json(entries);
  } catch (error) {
    console.error("Supabase articles request failed:", error?.name || "Unknown error");
    return response.status(502).json({ error: "Could not load journal entries" });
  }
};
