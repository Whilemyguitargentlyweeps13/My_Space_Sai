const loginPanel = document.querySelector("#login-panel");
const editorPanel = document.querySelector("#editor-panel");
const loginForm = document.querySelector("#login-form");
const articleForm = document.querySelector("#article-form");
const loginStatus = document.querySelector("#login-status");
const editorStatus = document.querySelector("#editor-status");
const entriesList = document.querySelector("#entries-list");
const entriesEmpty = document.querySelector("#entries-empty");
const saveButton = document.querySelector("#save-entry");
const titleInput = document.querySelector("#article-title");
const slugInput = document.querySelector("#article-slug");
const bodyEditor = document.querySelector("#article-body");
const imageInput = document.querySelector("#image-upload");
const videoInput = document.querySelector("#video-upload");

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MEDIA_BUCKET = "portfolio-journal-media";
const TEXT_BUCKET = "portfolio-journal-text";
let config = null;
let session = null;
let entries = [];
let slugEdited = false;

function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.dataset.error = String(isError);
}

async function readJson(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: config.publishableKey,
      Accept: "application/json",
      ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error("The request could not be completed. Check the Supabase setup and try again.");
  return data;
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && ((url.hostname.endsWith(".supabase.co") && url.pathname.includes("/storage/v1/object/public/")) || url.hostname === "raw.githubusercontent.com")) return url.href;
  } catch {}
  return "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
}

function plainTextFromHtml(value) {
  const documentCopy = new DOMParser().parseFromString(value, "text/html");
  return documentCopy.body.textContent || "";
}

function safeInline(node) {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.nodeValue);
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const children = [...node.childNodes].map(safeInline).join("");
  const tag = node.tagName.toLowerCase();
  const tags = { B: "strong", STRONG: "strong", I: "em", EM: "em", U: "u", CODE: "code", BR: "br" };
  if (tag === "A") {
    let href = "";
    try { const url = new URL(node.getAttribute("href")); if (url.protocol === "https:") href = url.href; } catch {}
    return href ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${children}</a>` : children;
  }
  return tags[node.tagName] ? `<${tags[node.tagName]}>${children}</${tags[node.tagName]}>` : children;
}

function blockHtml(block) {
  if (!block || typeof block !== "object") return "";
  if (block.type === "heading") return `<h2>${escapeHtml(block.text || "")}</h2>`;
  if (block.type === "paragraph") return `<p>${escapeHtml(block.text || "")}</p>`;
  if (block.type === "rich") return `<p>${safeInline(new DOMParser().parseFromString(block.html || "", "text/html").body)}</p>`;
  if (block.type === "code") return `<pre><code>${escapeHtml(block.code || "")}</code></pre>`;
  if (block.type === "list") return `<ul>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  if (block.type === "table") return `<table><thead><tr>${(block.headers || []).map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead><tbody>${(block.rows || []).map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  if (block.type === "image") {
    const src = safeUrl(block.src);
    return src ? `<figure><img src="${escapeHtml(src)}" alt="${escapeHtml(block.alt || "")}" /><figcaption>${escapeHtml(block.caption || "")}</figcaption></figure>` : "";
  }
  if (block.type === "video") {
    const src = safeUrl(block.src);
    return src ? `<figure><video src="${escapeHtml(src)}" controls preload="metadata"></video><figcaption>${escapeHtml(block.caption || "")}</figcaption></figure>` : "";
  }
  return "";
}

function blocksFromEditor() {
  const blocks = [];
  for (const node of bodyEditor.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue.trim();
      if (text) blocks.push({ type: "rich", html: escapeHtml(text) });
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const tag = node.tagName.toLowerCase();
    if (["h1", "h2", "h3"].includes(tag)) {
      const text = node.textContent.trim();
      if (text) blocks.push({ type: "heading", text });
    } else if (tag === "pre") {
      blocks.push({ type: "code", code: node.textContent.slice(0, 20000) });
    } else if (tag === "ul" || tag === "ol") {
      const items = [...node.querySelectorAll(":scope > li")].map((item) => item.textContent.trim()).filter(Boolean);
      if (items.length) blocks.push({ type: "list", items });
    } else if (tag === "table") {
      const headers = [...node.querySelectorAll("thead th")].map((cell) => cell.textContent.trim());
      const rows = [...node.querySelectorAll("tbody tr")].map((row) => [...row.querySelectorAll("th,td")].map((cell) => cell.textContent.trim()));
      if (headers.length) blocks.push({ type: "table", headers, rows });
    } else if (tag === "figure") {
      const image = node.querySelector("img");
      const video = node.querySelector("video");
      const caption = node.querySelector("figcaption")?.textContent.trim() || "";
      if (image) {
        const src = safeUrl(image.getAttribute("src"));
        if (src) blocks.push({ type: "image", src, alt: image.getAttribute("alt") || "", caption });
      } else if (video) {
        const src = safeUrl(video.getAttribute("src"));
        if (src) blocks.push({ type: "video", src, caption });
      }
    } else if (tag === "img") {
      const src = safeUrl(node.getAttribute("src"));
      if (src) blocks.push({ type: "image", src, alt: node.getAttribute("alt") || "", caption: "" });
    } else if (tag === "video") {
      const src = safeUrl(node.getAttribute("src"));
      if (src) blocks.push({ type: "video", src, caption: "" });
    } else {
      const html = [...node.childNodes].map(safeInline).join("").trim();
      if (html) blocks.push({ type: "rich", html });
    }
  }
  return blocks.slice(0, 300);
}

function blocksToText(blocks) {
  return blocks.map((block) => {
    if (block.type === "heading") return `## ${block.text || ""}`;
    if (block.type === "paragraph") return block.text || "";
    if (block.type === "rich") return plainTextFromHtml(block.html || "");
    if (block.type === "code") return `\`\`\`\n${block.code || ""}\n\`\`\``;
    if (block.type === "list") return (block.items || []).map((item) => `- ${item}`).join("\n");
    if (block.type === "image") return `[Image: ${block.alt || block.caption || "journal image"}] ${block.src || ""}`;
    if (block.type === "video") return `[Video: ${block.caption || "journal video"}] ${block.src || ""}`;
    return "";
  }).filter(Boolean).join("\n\n");
}

function renderEntries() {
  entriesList.replaceChildren();
  entriesEmpty.hidden = entries.length > 0;
  for (const entry of entries) {
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    button.type = "button";
    button.className = "admin-entry-button";
    button.dataset.id = entry.id;
    title.textContent = entry.title;
    meta.textContent = `${entry.is_published ? "PUBLISHED" : "DRAFT"} · ${entry.slug}`;
    button.append(title, meta);
    button.addEventListener("click", () => loadEntry(entry));
    entriesList.append(button);
  }
}

function loadEntry(entry) {
  articleForm.elements.id.value = entry.id;
  titleInput.value = entry.title || "";
  slugInput.value = entry.slug || "";
  document.querySelector("#article-category").value = entry.category || "Build notes";
  document.querySelector("#article-intro").value = entry.intro || "";
  bodyEditor.innerHTML = (Array.isArray(entry.content) ? entry.content : []).map(blockHtml).join("");
  document.querySelector("#article-published").checked = Boolean(entry.is_published);
  slugEdited = true;
  showStatus(editorStatus, `Editing ${entry.slug}`);
}

function startNewEntry() {
  articleForm.reset();
  articleForm.elements.id.value = "";
  bodyEditor.replaceChildren();
  document.querySelector("#article-category").value = "Build notes";
  slugEdited = false;
  showStatus(editorStatus, "New draft");
  titleInput.focus();
}

async function loadEntries() {
  entries = await supabaseRequest("/rest/v1/articles?select=id,slug,title,category,intro,content,is_published,published_at,created_at&order=created_at.desc&limit=100");
  if (!Array.isArray(entries)) throw new Error("Could not load journal entries.");
  renderEntries();
}

async function verifyAdmin(userId) {
  const query = new URLSearchParams({ select: "user_id", user_id: `eq.${userId}`, limit: "1" });
  const rows = await supabaseRequest(`/rest/v1/portfolio_admins?${query}`);
  return Array.isArray(rows) && rows.some((row) => row.user_id === userId);
}

async function revokeSession(accessToken) {
  try {
    await fetch(`${config.supabaseUrl}/auth/v1/logout`, {
      method: "POST",
      headers: { apikey: config.publishableKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}

function safeFileName(name) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-90) || "upload";
}

function storagePathUrl(bucket, path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${config.supabaseUrl}/storage/v1/object/public/${bucket}/${encoded}`;
}

async function uploadObject(bucket, path, blob, contentType, upsert = false) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${config.supabaseUrl}/storage/v1/object/${bucket}/${encoded}`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": contentType,
      "x-upsert": String(upsert),
    },
    body: blob,
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error("Supabase could not store this file. Check the storage setup and file size.");
}

async function uploadMedia(file, kind) {
  const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  const allowed = kind === "image"
    ? ["image/jpeg", "image/png", "image/webp", "image/gif"]
    : ["video/mp4", "video/webm", "video/ogg"];
  if (!allowed.includes(file.type) || file.size > maxBytes) {
    throw new Error(kind === "image" ? "Choose a JPG, PNG, WebP, or GIF image under 15 MB." : "Choose an MP4, WebM, or Ogg video under 50 MB.");
  }
  const slug = slugInput.value.trim() || "draft";
  const path = `${slug}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  await uploadObject(MEDIA_BUCKET, path, file, file.type);
  return storagePathUrl(MEDIA_BUCKET, path);
}

function insertHtmlAtCursor(html) {
  bodyEditor.focus();
  document.execCommand("insertHTML", false, html);
}

async function handleMediaInput(input, kind) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  showStatus(editorStatus, `Uploading ${kind}…`);
  try {
    const url = await uploadMedia(file, kind);
    if (kind === "image") insertHtmlAtCursor(`<figure><img src="${escapeHtml(url)}" alt=""><figcaption></figcaption></figure><p><br></p>`);
    else insertHtmlAtCursor(`<figure><video src="${escapeHtml(url)}" controls preload="metadata"></video><figcaption></figcaption></figure><p><br></p>`);
    showStatus(editorStatus, `${kind === "image" ? "Image" : "Video"} added to the post.`);
  } catch (error) {
    showStatus(editorStatus, error.message || `Could not upload ${kind}.`, true);
  }
}

function safeTextFile(title, intro, blocks) {
  const body = blocksToText(blocks);
  return `${title}\n${"=".repeat(Math.min(title.length, 72))}\n\n${intro}\n\n${body}\n`;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type=submit]");
  const form = new FormData(loginForm);
  button.disabled = true;
  showStatus(loginStatus, "Checking owner access…");
  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: config.publishableKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      signal: AbortSignal.timeout(10000),
    });
    const auth = await readJson(response);
    if (!response.ok || !auth?.access_token || !auth?.user?.id) throw new Error("Sign-in failed. Check the email and password.");
    session = { accessToken: auth.access_token };
    if (!(await verifyAdmin(auth.user.id))) {
      await revokeSession(session.accessToken);
      session = null;
      throw new Error("This account is not enabled to edit the portfolio.");
    }
    await loadEntries();
    loginPanel.hidden = true;
    editorPanel.hidden = false;
    document.querySelector("#admin-email").value = "";
    document.querySelector("#admin-password").value = "";
    showStatus(editorStatus, "Signed in. Only owner-authorized content is editable here.");
  } catch (error) {
    if (session?.accessToken) await revokeSession(session.accessToken);
    session = null;
    loginPanel.hidden = false;
    editorPanel.hidden = true;
    loginForm.elements.password.value = "";
    showStatus(loginStatus, error.message || "Could not sign in. Try again.", true);
  } finally {
    button.disabled = false;
  }
});

titleInput.addEventListener("input", () => { if (!slugEdited) slugInput.value = slugify(titleInput.value); });
slugInput.addEventListener("input", () => { slugEdited = true; });
document.querySelector("#new-entry").addEventListener("click", startNewEntry);

document.querySelectorAll(".editor-toolbar [data-command], .editor-toolbar [data-format]").forEach((button) => {
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => {
    bodyEditor.focus();
    if (button.dataset.command) document.execCommand(button.dataset.command, false);
    if (button.dataset.format) document.execCommand("formatBlock", false, button.dataset.format);
  });
});

document.querySelector("#add-link").addEventListener("mousedown", (event) => event.preventDefault());
document.querySelector("#add-link").addEventListener("click", () => {
  bodyEditor.focus();
  const candidate = window.prompt("Paste the HTTPS link:");
  if (!candidate) return;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") throw new Error();
    document.execCommand("createLink", false, url.href);
    bodyEditor.querySelectorAll("a").forEach((link) => { link.target = "_blank"; link.rel = "noopener noreferrer"; });
  } catch {
    showStatus(editorStatus, "Use a valid HTTPS link.", true);
  }
});

imageInput.addEventListener("change", () => handleMediaInput(imageInput, "image"));
videoInput.addEventListener("change", () => handleMediaInput(videoInput, "video"));

articleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(articleForm);
  const slug = String(form.get("slug") || "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    showStatus(editorStatus, "Use a lowercase URL slug with letters, numbers, and hyphens.", true);
    slugInput.focus();
    return;
  }

  saveButton.disabled = true;
  showStatus(editorStatus, "Saving the post and its private text copy…");
  const isPublished = document.querySelector("#article-published").checked;
  const blocks = blocksFromEditor();
  const title = String(form.get("title") || "").trim();
  const intro = String(form.get("intro") || "").trim();
  const id = String(form.get("id") || "");
  const textPath = `${slug}/${slug}.txt`;
  const payload = {
    title,
    slug,
    category: String(form.get("category") || "Build notes").trim(),
    intro,
    content: blocks,
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
  };

  try {
    await uploadObject(TEXT_BUCKET, textPath, new Blob([safeTextFile(title, intro, blocks)], { type: "text/plain;charset=utf-8" }), "text/plain", true);
    const query = id ? `?id=eq.${encodeURIComponent(id)}` : "";
    await supabaseRequest(`/rest/v1/articles${query}`, {
      method: id ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    await loadEntries();
    showStatus(editorStatus, isPublished ? "Saved and published. The text copy is in your private Supabase storage." : "Draft saved. The private text copy is stored; the draft is not public.");
  } catch (error) {
    showStatus(editorStatus, error.message || "Could not save the entry.", true);
  } finally {
    saveButton.disabled = false;
  }
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  const accessToken = session?.accessToken;
  session = null;
  entries = [];
  articleForm.reset();
  bodyEditor.replaceChildren();
  editorPanel.hidden = true;
  loginPanel.hidden = false;
  showStatus(loginStatus, "Signed out.");
  if (accessToken) await revokeSession(accessToken);
});

async function init() {
  try {
    const response = await fetch("/api/admin-config", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    const settings = await readJson(response);
    if (!response.ok || typeof settings?.supabaseUrl !== "string" || typeof settings?.publishableKey !== "string") throw new Error("The editor is not connected to Supabase yet.");
    const url = new URL(settings.supabaseUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co") || !settings.publishableKey.startsWith("sb_publishable_")) throw new Error("The Supabase configuration is invalid.");
    config = { supabaseUrl: url.origin, publishableKey: settings.publishableKey };
    loginForm.querySelectorAll("input, button").forEach((element) => { element.disabled = false; });
  } catch (error) {
    loginForm.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
    showStatus(loginStatus, error.message || "The editor could not connect.", true);
  }
}

init();
