import { projects, categories } from "../content/projects.js";
import { articles } from "../content/articles.js";

const list = document.querySelector("#project-list");
const filters = document.querySelector("#project-filters");
let activeProjects = projects;
let activeCategory = "All";
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);

function renderProject(project, index) {
  const number = String(index + 1).padStart(2, "0");
  return `<article class="project-row">
    <div class="project-visual project-visual-${index + 1}" aria-hidden="true">
      <span class="visual-label mono">FIG. ${number} / ${escapeHtml(project.category.toUpperCase())}</span>
      <span class="visual-index">${number}</span>
      <span class="visual-signal signal-a"></span><span class="visual-signal signal-b"></span>
      <span class="visual-name mono">${escapeHtml(project.slug.replaceAll("-", " / ").toUpperCase())}</span>
    </div>
    <div class="project-info">
      <div class="project-meta mono"><span>${number} &nbsp;—&nbsp; ${escapeHtml(project.category.toUpperCase())}</span><span class="project-status">STATUS / ${escapeHtml(project.status.toUpperCase())}</span></div>
      <h3>${escapeHtml(project.title)}</h3>
      <p>${escapeHtml(project.summary)}</p>
      <ul class="tag-list" aria-label="Technologies">${project.technologies.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>
      <a class="text-link" href="project.html?id=${encodeURIComponent(project.slug)}">OPEN PROJECT FILE <span aria-hidden="true">↗</span></a>
    </div>
  </article>`;
}

function showProjects(category = activeCategory) {
  const matching = category === "All" ? activeProjects : activeProjects.filter((project) => project.category === category);
  list.innerHTML = matching.map(renderProject).join("");
}

function renderFilters() {
  const availableCategories = ["All", ...new Set(activeProjects.map((project) => project.category))];
  filters.innerHTML = availableCategories.map((category) => {
    const active = category === activeCategory;
    const count = category === "All" ? activeProjects.length : activeProjects.filter((project) => project.category === category).length;
    return `<button class="filter-chip${active ? " is-active" : ""}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${active}">${escapeHtml(category)}<span>${String(count).padStart(2, "0")}</span></button>`;
  }).join("");
}
renderFilters();

filters.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  filters.querySelectorAll(".filter-chip").forEach((chip) => {
    const active = chip === button;
    chip.classList.toggle("is-active", active);
    chip.setAttribute("aria-pressed", String(active));
  });
  showProjects(button.dataset.category);
});
showProjects();

async function loadPublishedProjects() {
  try {
    const response = await fetch("/api/projects", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const remoteProjects = await response.json();
    if (!Array.isArray(remoteProjects) || remoteProjects.length === 0) return;
    activeProjects = remoteProjects;
    if (!activeProjects.some((project) => project.category === activeCategory)) activeCategory = "All";
    renderFilters();
    showProjects();
  } catch {
    // Local content remains available when the Supabase-backed API is not configured.
  }
}
loadPublishedProjects();

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");
menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  nav.classList.toggle("is-open", open);
});
nav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open navigation");
  nav.classList.remove("is-open");
}));

const observed = document.querySelectorAll("main section[id]");
if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      document.querySelectorAll("[data-nav]").forEach((link) => {
        if (link.getAttribute("href") === `#${entry.target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
  }, { rootMargin: "-35% 0px -55% 0px" });
  observed.forEach((section) => sectionObserver.observe(section));
}

document.querySelector("#year").textContent = new Date().getFullYear();

function renderArticles(entries) {
  if (!entries.length) return;
  const empty = document.querySelector(".journal-empty");
  empty.innerHTML = entries.map((article) => `<a class="journal-entry" href="article.html?id=${encodeURIComponent(article.slug)}"><span class="mono">${escapeHtml(article.category)} · ${escapeHtml(article.date)}</span><strong>${escapeHtml(article.title)}</strong><span>${escapeHtml(article.intro)}</span></a>`).join("");
}
renderArticles(articles);
fetch("/api/articles", { headers: { Accept: "application/json" } })
  .then((response) => response.ok ? response.json() : null)
  .then((remoteArticles) => { if (Array.isArray(remoteArticles) && remoteArticles.length) renderArticles(remoteArticles); })
  .catch(() => {});
