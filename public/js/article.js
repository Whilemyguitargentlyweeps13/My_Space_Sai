import { articles as localArticles } from "../content/articles.js";

const slug = new URLSearchParams(location.search).get("id");
const main = document.querySelector(".article-main");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
const slugify = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function sanitizeRichNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.nodeValue);
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const tag = node.tagName.toLowerCase();
  const children = [...node.childNodes].map(sanitizeRichNode).join("");
  const allowed = { strong: "strong", b: "strong", em: "em", i: "em", u: "u", code: "code", br: "br" };
  if (tag === "a") {
    try {
      const url = new URL(node.getAttribute("href"));
      if (url.protocol === "https:") return `<a href="${escapeHtml(url.href)}" rel="noopener noreferrer">${children}</a>`;
    } catch {}
    return children;
  }
  if (tag === "br") return "<br>";
  if (allowed[tag]) return `<${allowed[tag]}>${children}</${allowed[tag]}>`;
  return children;
}

function safeRichHtml(value) {
  const parsed = new DOMParser().parseFromString(String(value || ""), "text/html");
  return [...parsed.body.childNodes].map(sanitizeRichNode).join("");
}

function renderNotFound() {
  main.innerHTML = `<section class="article-empty section-paper"><p class="mono">JOURNAL / NO ENTRY FOUND</p><h1 class="display-heading">NOT IN THE<br /><em>LOGBOOK.</em></h1><a class="text-link" href="index.html#journal">← BACK TO THE JOURNAL</a></section>`;
}

function renderBlock(block) {
  if (block.type === "heading") {
    const text = escapeHtml(block.text);
    return `<h2 id="${slugify(block.text)}">${text}</h2>`;
  }
  if (block.type === "paragraph") return `<p>${escapeHtml(block.text)}</p>`;
  if (block.type === "rich") return `<p>${safeRichHtml(block.html)}</p>`;
  if (block.type === "code") return `<pre><code>${escapeHtml(block.code)}</code></pre>`;
  if (block.type === "list") return `<ul>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  if (block.type === "image") {
    const src = safeHttpUrl(block.src);
    if (!src) return "";
    return `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(block.alt)}" loading="lazy" /><figcaption>${escapeHtml(block.caption)}</figcaption></figure>`;
  }
  if (block.type === "video") {
    const src = safeHttpUrl(block.src);
    if (!src || !new URL(src).hostname.endsWith(".supabase.co")) return "";
    return `<figure><video src="${escapeHtml(src)}" controls preload="metadata"></video><figcaption>${escapeHtml(block.caption || "")}</figcaption></figure>`;
  }
  if (block.type === "table") return `<div class="article-table-wrap"><table><thead><tr>${(block.headers || []).map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${(block.rows || []).map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  return "";
}

function renderArticle(article, articles) {
  if (!article) return renderNotFound();
  document.title = `${article.title} — Engineering Journal`;
  document.querySelector('meta[name="description"]').content = article.intro;
  const blocks = article.blocks || [];
  const words = JSON.stringify(blocks).match(/\b[\w'-]+\b/g)?.length || 0;
  const minutes = Math.max(1, Math.ceil(words / 220));
  const headings = blocks.filter((block) => block.type === "heading");
  const body = blocks.map(renderBlock).join("");
  const toc = headings.map((heading) => `<a href="#${slugify(heading.text)}">${escapeHtml(heading.text)}</a>`).join("");
  const index = articles.indexOf(article);
  const previous = articles[index - 1];
  const next = articles[index + 1];
  main.innerHTML = `<header class="article-hero section-green"><p class="mono">${escapeHtml(article.category)} / ${escapeHtml(article.date)} / ${minutes} MIN READ</p><h1 class="display-heading">${escapeHtml(article.title)}</h1><p class="article-lead">${escapeHtml(article.intro)}</p></header><div class="article-layout">${toc ? `<aside class="article-toc"><p class="mono">IN THIS NOTE</p>${toc}</aside>` : ""}<article class="article-body">${body}</article></div><nav class="article-pagination" aria-label="Adjacent articles">${previous ? `<a href="article.html?id=${encodeURIComponent(previous.slug)}">← ${escapeHtml(previous.title)}</a>` : "<span></span>"}${next ? `<a href="article.html?id=${encodeURIComponent(next.slug)}">${escapeHtml(next.title)} →</a>` : "<span></span>"}</nav>`;
}

async function init() {
  let availableArticles = localArticles;
  try {
    const response = await fetch("/api/articles", { headers: { Accept: "application/json" } });
    if (response.ok) {
      const remoteArticles = await response.json();
      if (Array.isArray(remoteArticles) && remoteArticles.length) availableArticles = remoteArticles;
    }
  } catch {
    // The local content remains the fallback before Supabase is configured.
  }
  renderArticle(availableArticles.find((item) => item.slug === slug), availableArticles);
}

init();
