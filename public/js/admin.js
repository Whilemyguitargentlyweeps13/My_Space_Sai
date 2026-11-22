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
const bodyInput = document.querySelector("#article-body");

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
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
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
    signal: AbortSignal.timeout(10000),
  });
  const data = await readJson(response);
  if (!response.ok) throw new Error("The request could not be completed. Check your sign-in and try again.");
  return data;
}

function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
}

function blocksToText(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => {
    if (block.type === "heading") return `# ${block.text || ""}`;
    if (block.type === "paragraph") return block.text || "";
    if (block.type === "code") return `\`\`\`\n${block.code || ""}\n\`\`\``;
    if (block.type === "list") return (block.items || []).map((item) => `- ${item}`).join("\n");
    if (block.type === "image") return `![${block.alt || ""}](${block.src || ""})`;
    if (block.type === "table") return [block.headers || [], ...(block.rows || [])].map((row) => `| ${row.join(" | ")} |`).join("\n");
    return "";
  }).filter(Boolean).join("\n\n");
}

function textToBlocks(value) {
  const blocks = [];
  const lines = value.replace(/\r/g, "").split("\n");
  let paragraph = [];
  let list = [];
  let table = [];
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ").trim() });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: list });
    list = [];
  };
  const flushTable = () => {
    if (table.length) {
      const rows = table.map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
      const dataRows = rows.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
      if (dataRows.length) blocks.push({ type: "table", headers: dataRows[0], rows: dataRows.slice(1) });
    }
    table = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      flushTable();
      if (inCode) blocks.push({ type: "code", code: code.join("\n") });
      code = [];
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    const image = line.match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/);
    const tableLine = /^\|.*\|$/.test(line.trim());
    if (heading || image || tableLine || !line.trim() || /^-\s+/.test(line)) {
      flushParagraph();
      if (!tableLine) flushTable();
      if (!/^[-\s]/.test(line) || !line.trim()) flushList();
      if (heading) blocks.push({ type: "heading", text: heading[1].trim() });
      else if (image) blocks.push({ type: "image", alt: image[1], src: image[2] });
      else if (tableLine) table.push(line);
      else if (/^-\s+/.test(line)) list.push(line.replace(/^-\s+/, "").trim());
      continue;
    }
    flushList();
    flushTable();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  flushTable();
  if (inCode && code.length) blocks.push({ type: "code", code: code.join("\n") });
  return blocks.slice(0, 300);
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
  bodyInput.value = blocksToText(entry.content);
  document.querySelector("#article-published").checked = Boolean(entry.is_published);
  slugEdited = true;
  showStatus(editorStatus, `Editing ${entry.slug}`);
}

function startNewEntry() {
  articleForm.reset();
  articleForm.elements.id.value = "";
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

titleInput.addEventListener("input", () => {
  if (!slugEdited) slugInput.value = slugify(titleInput.value);
});
slugInput.addEventListener("input", () => { slugEdited = true; });
document.querySelector("#new-entry").addEventListener("click", startNewEntry);

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
  showStatus(editorStatus, "Saving…");
  const isPublished = document.querySelector("#article-published").checked;
  const payload = {
    title: String(form.get("title") || "").trim(),
    slug,
    category: String(form.get("category") || "Build notes").trim(),
    intro: String(form.get("intro") || "").trim(),
    content: textToBlocks(String(form.get("body") || "")),
    is_published: isPublished,
    published_at: isPublished ? new Date().toISOString() : null,
  };
  try {
    const id = String(form.get("id") || "");
    const query = id ? `?id=eq.${encodeURIComponent(id)}` : "";
    await supabaseRequest(`/rest/v1/articles${query}`, {
      method: id ? "PATCH" : "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    });
    await loadEntries();
    showStatus(editorStatus, isPublished ? "Entry saved and published." : "Draft saved. It is not visible on the public site.");
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
  editorPanel.hidden = true;
  loginPanel.hidden = false;
  showStatus(loginStatus, "Signed out.");
  if (accessToken) await revokeSession(accessToken);
});

async function init() {
  try {
    const response = await fetch("/api/admin-config", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
    const settings = await readJson(response);
    if (!response.ok || typeof settings?.supabaseUrl !== "string" || typeof settings?.publishableKey !== "string") {
      throw new Error("The editor is not connected to Supabase yet.");
    }
    const url = new URL(settings.supabaseUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co") || !settings.publishableKey.startsWith("sb_publishable_")) {
      throw new Error("The Supabase configuration is invalid.");
    }
    config = { supabaseUrl: url.origin, publishableKey: settings.publishableKey };
    loginForm.querySelectorAll("input, button").forEach((element) => { element.disabled = false; });
  } catch (error) {
    loginForm.querySelectorAll("input, button").forEach((element) => { element.disabled = true; });
    showStatus(loginStatus, error.message || "The editor could not connect.", true);
  }
}

init();
