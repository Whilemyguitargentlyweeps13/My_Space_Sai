const { getSupabaseRestUrl } = require("../lib/supabase");
const asText = (value, fallback = "", max = 4000) =>
  typeof value === "string" ? value.slice(0, max) : fallback;
const asTextList = (value, maxItems = 30) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string").slice(0, maxItems).map((item) => item.slice(0, 300))
    : [];
const asDetails = (value) =>
  Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)).slice(0, 30)
        .map((item) => ({ label: asText(item.label, "DETAIL", 120), value: asText(item.value, "", 3000) }))
    : [];
const asFileUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

module.exports = async function projects(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const config = getSupabaseRestUrl("projects");
  if (!config) {
    return response.status(503).json({ error: "Supabase is not configured" });
  }

  const { endpoint, publishableKey } = config;
  endpoint.searchParams.set(
    "select",
    "slug,title,category,status,summary,overview,project_focus,core_question,technologies,system_map,available_details,engineering_questions,project_files(id,label,kind,file_url,storage_provider,visibility,sort_order)"
  );
  endpoint.searchParams.set("is_published", "eq.true");
  endpoint.searchParams.set("order", "created_at.desc");
  endpoint.searchParams.set("limit", "100");

  try {
    const upstream = await fetch(endpoint, {
      headers: { apikey: publishableKey, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      console.error("Supabase projects read failed:", upstream.status);
      return response.status(502).json({ error: "Could not load projects" });
    }

    const body = await upstream.text();
    if (Buffer.byteLength(body, "utf8") > 1_000_000) {
      return response.status(502).json({ error: "Project data is too large" });
    }
    const rows = JSON.parse(body);
    if (!Array.isArray(rows)) throw new Error("Unexpected Supabase response");
    const projects = rows
      .filter(
        (row) =>
          row &&
          typeof row === "object" &&
          /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug || "") &&
          typeof row.title === "string",
      )
      .map((row) => {
        const rawMap =
          row.system_map && typeof row.system_map === "object" && !Array.isArray(row.system_map)
            ? row.system_map
            : {};
        const files = (Array.isArray(row.project_files) ? row.project_files : [])
          .filter((file) => file && typeof file === "object" && file.visibility === "public")
          .map((file) => ({
            label: asText(file.label, "Project file", 160),
            kind: asText(file.kind, "file", 40),
            url: asFileUrl(file.file_url),
            visibility: "public",
            sortOrder: Number.isFinite(file.sort_order) ? file.sort_order : 0,
          }))
          .filter((file) => file.url)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .slice(0, 30)
          .map(({ label, kind, url, visibility }) => ({ label, kind, url, visibility }));

        return {
          slug: asText(row.slug, "", 120),
          title: asText(row.title, "Untitled project", 200),
          category: asText(row.category, "Project", 100),
          status: asText(row.status, "To confirm", 40),
          summary: asText(row.summary, "", 1200),
          overview: asText(row.overview, "", 10000),
          projectFocus: asText(row.project_focus),
          coreQuestion: asText(row.core_question),
          technologies: asTextList(row.technologies, 30),
          systemMap:
            typeof rawMap.center === "string"
              ? {
                  label: asText(rawMap.label, "SYSTEM MAP", 100),
                  center: asText(rawMap.center, "NOT DOCUMENTED", 160),
                  nodes: asTextList(rawMap.nodes, 12),
                  note: asText(rawMap.note, "", 1000),
                }
              : {
                  label: "SYSTEM MAP",
                  center: "NOT DOCUMENTED",
                  nodes: [],
                  note: "A system map can be added when the project architecture is ready to share.",
                },
          availableDetails: asDetails(row.available_details),
          engineeringQuestions: asTextList(row.engineering_questions, 30),
          files,
        };
      });

    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response.status(200).json(projects);
  } catch (error) {
    console.error("Supabase projects request failed:", error?.name || "Unknown error");
    return response.status(502).json({ error: "Could not load projects" });
  }
};
