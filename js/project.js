import { projects as localProjects } from "../content/projects.js";

const slug = new URLSearchParams(window.location.search).get("id");
const main = document.querySelector(".project-main");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);

function safePublicFiles(project) {
  return (project.files || []).filter((file) => {
    if (file.visibility && file.visibility !== "public") return false;
    try {
      return ["https:", "http:"].includes(new URL(file.url).protocol);
    } catch {
      return false;
    }
  });
}

function renderNotFound() {
  document.title = "Project not found — Sai Balaji Nagarajan";
  main.innerHTML = `<section class="project-not-found section-paper"><p class="mono">404 / PROJECT FILE NOT FOUND</p><h1 class="display-heading">NO SIGNAL.</h1><a class="text-link" href="index.html#projects">← RETURN TO PROJECTS</a></section>`;
}

function renderProject(project, allProjects) {
  if (!project) return renderNotFound();

  document.title = `${project.title} — Sai Balaji Nagarajan`;
  document.querySelector('meta[name="description"]').content = project.summary;
  const number = String(allProjects.indexOf(project) + 1).padStart(2, "0");
  const systemMap = project.systemMap || { label: "SYSTEM MAP", center: "NOT DOCUMENTED", nodes: [], note: "A system map can be added when the project architecture is ready to share." };
  const nodes = (systemMap.nodes || []).map((node, index) =>
    `<div class="map-node map-node-${index + 1}"><span class="mono">${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(node)}</strong></div>`
  ).join("");
  const questions = (project.engineeringQuestions || []).map((question, index) =>
    `<li><span class="mono">${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(question)}</p></li>`
  ).join("");
  const files = safePublicFiles(project);
  const previous = allProjects[(allProjects.indexOf(project) + allProjects.length - 1) % allProjects.length];
  const next = allProjects[(allProjects.indexOf(project) + 1) % allProjects.length];

  main.innerHTML = `
    <section class="project-detail-hero section-green">
      <div class="section-kicker mono"><span>PROJECT FILE / ${number}</span><span>${escapeHtml(project.category.toUpperCase())}</span></div>
      <div class="project-hero-copy">
        <p class="eyebrow mono"><span class="orange-dot"></span> STATUS / ${escapeHtml(project.status.toUpperCase())}</p>
        <h1 class="display-heading">${escapeHtml(project.title)}</h1>
        <p class="project-detail-lead">${escapeHtml(project.projectFocus)}</p>
        ${project.coreQuestion ? `<p class="project-question">${escapeHtml(project.coreQuestion)}</p>` : ""}
      </div>
      <div class="project-detail-tags mono">${project.technologies.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <span class="project-hero-index" aria-hidden="true">${number}</span>
    </section>

    <section class="project-map-section section-paper">
      <div class="section-kicker mono"><span>01 / ${escapeHtml(systemMap.label)}</span><span>FUNCTIONS, NOT A SCHEMATIC</span></div>
      <div class="project-map-layout">
        <div class="system-map" role="img" aria-label="${escapeHtml(systemMap.label.toLowerCase())} centered on ${escapeHtml(systemMap.center)}; includes ${escapeHtml((systemMap.nodes || []).join(", "))}">
          <div class="map-lines" aria-hidden="true"></div>
          <div class="map-center"><span class="mono">CONTROL / CORE</span><strong>${escapeHtml(systemMap.center)}</strong></div>
          ${nodes}
          <span class="map-cross map-cross-one" aria-hidden="true">+</span><span class="map-cross map-cross-two" aria-hidden="true">+</span>
        </div>
        <div class="map-reading"><p class="mono">READ THE SYSTEM</p><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.overview)}</p><p class="mono map-caveat">${escapeHtml(systemMap.note)}</p></div>
      </div>
    </section>

    <section class="project-record section-dark">
      <div class="section-kicker mono"><span>02 / DOCUMENTED SCOPE</span><span>FROM THE CURRENT PROJECT RECORD</span></div>
      <div class="record-heading"><h2 class="display-heading">WHAT’S<br /><em>KNOWN.</em></h2><p class="record-intro">A project becomes easier to trust when its parts are visible. Here is what the current project record supports.</p></div>
      <div class="record-grid">${project.availableDetails.map((fact, index) => `<article class="record-item"><span class="mono">${String(index + 1).padStart(2, "0")} / ${escapeHtml(fact.label.toUpperCase())}</span><p>${escapeHtml(fact.value)}</p></article>`).join("")}</div>
      <div class="record-footer mono"><span>IMPLEMENTATION DETAILS</span><span>STATUS: ${escapeHtml(project.status.toUpperCase())}</span></div>
    </section>

    ${files.length ? `<section class="project-files section-paper"><div class="section-kicker mono"><span>03 / PROJECT FILES</span><span>PUBLIC REFERENCES</span></div><div class="project-files-list">${files.map((file, index) => `<a class="project-file-link" href="${escapeHtml(file.url)}" target="_blank" rel="noopener noreferrer"><span class="mono">${String(index + 1).padStart(2, "0")} / ${escapeHtml((file.kind || "file").toUpperCase())}</span><strong>${escapeHtml(file.label)}</strong><span aria-hidden="true">↗</span></a>`).join("")}</div></section>` : ""}

    <section class="project-next section-orange">
      <div class="section-kicker mono"><span>${files.length ? "04" : "03"} / NEXT LAYER OF THE RECORD</span><span>QUESTIONS TO ANSWER FROM THE BUILD</span></div>
      <div class="next-grid"><h2 class="display-heading">GO<br />DEEPER.</h2><div><p class="next-intro">The résumé gives the outline. These are the details that can turn the outline into an engineering story, once you’re ready to document them.</p><ol class="question-list">${questions}</ol></div></div>
    </section>
    <nav class="project-pagination section-paper" aria-label="Other projects">
      ${previous.slug === project.slug ? "" : `<a href="project.html?id=${encodeURIComponent(previous.slug)}">← ${escapeHtml(previous.title)}</a>`}
      <a class="all-projects-link" href="index.html#projects">ALL PROJECTS</a>
      ${next.slug === project.slug ? "" : `<a href="project.html?id=${encodeURIComponent(next.slug)}">${escapeHtml(next.title)} →</a>`}
    </nav>`;
}

async function init() {
  let availableProjects = localProjects;
  try {
    const response = await fetch("/api/projects", { headers: { Accept: "application/json" } });
    if (response.ok) {
      const remoteProjects = await response.json();
      if (Array.isArray(remoteProjects) && remoteProjects.length) availableProjects = remoteProjects;
    }
  } catch {
    // The local content remains the fallback before Supabase is configured.
  }
  renderProject(availableProjects.find((item) => item.slug === slug), availableProjects);
}

init();
