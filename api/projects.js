module.exports = async function projects(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const projectUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!projectUrl || !publishableKey) {
    return response.status(503).json({ error: "Supabase is not configured" });
  }

  const endpoint = new URL("/rest/v1/projects", projectUrl);
  endpoint.searchParams.set(
    "select",
    "slug,title,category,status,summary,overview,project_focus,core_question,technologies,system_map,available_details,engineering_questions,project_files(id,label,kind,file_url,storage_provider,visibility,sort_order)"
  );
  endpoint.searchParams.set("is_published", "eq.true");
  endpoint.searchParams.set("order", "created_at.desc");

  try {
    const upstream = await fetch(endpoint, {
      headers: { apikey: publishableKey, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      console.error("Supabase projects read failed:", upstream.status);
      return response.status(502).json({ error: "Could not load projects" });
    }

    const rows = await upstream.json();
    const projects = rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      category: row.category,
      status: row.status,
      summary: row.summary,
      overview: row.overview,
      projectFocus: row.project_focus || "",
      coreQuestion: row.core_question || "",
      technologies: row.technologies || [],
      systemMap: row.system_map?.center ? row.system_map : {
        label: "SYSTEM MAP",
        center: "NOT DOCUMENTED",
        nodes: [],
        note: "A system map can be added when the project architecture is ready to share.",
      },
      availableDetails: row.available_details || [],
      engineeringQuestions: row.engineering_questions || [],
      files: (row.project_files || [])
        .filter((file) => file.visibility === "public" && file.file_url)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((file) => ({ label: file.label, kind: file.kind, url: file.file_url })),
    }));

    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response.status(200).json(projects);
  } catch (error) {
    console.error("Supabase projects request failed:", error?.name || "Unknown error");
    return response.status(502).json({ error: "Could not load projects" });
  }
};
