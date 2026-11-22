import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "public");
const port = Number(process.env.PORT) || 4173;
const rootFiles = new Set(["index.html", "article.html", "project.html", "admin.html", "styles.css", "admin.css"]);
const publicDirectories = new Set(["assets", "content", "js"]);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: https://*.supabase.co https://raw.githubusercontent.com; connect-src 'self' https://*.supabase.co; frame-src 'none'; upgrade-insecure-requests",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function reply(response, status, message, method) {
  response.writeHead(status, {
    ...securityHeaders,
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(method === "HEAD" ? undefined : message);
}

createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    reply(response, 405, "Method not allowed", request.method);
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    reply(response, 400, "Bad request", request.method);
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const segments = relativePath.split(/[\\/]+/);
  if (segments.some((segment) => !segment || segment.startsWith("."))) {
    reply(response, 404, "Not found", request.method);
    return;
  }

  const file = resolve(root, relativePath);
  const fromRoot = relative(root, file);
  if (
    fromRoot === "" ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    (segments.length === 1 && !rootFiles.has(segments[0])) ||
    (segments.length > 1 && !publicDirectories.has(segments[0])) ||
    !mime[extname(file).toLowerCase()]
  ) {
    reply(response, 404, "Not found", request.method);
    return;
  }

  try {
    const details = await stat(file);
    if (!details.isFile()) {
      reply(response, 404, "Not found", request.method);
      return;
    }
    const body = await readFile(file);
    response.writeHead(200, {
      ...securityHeaders,
      "Content-Type": mime[extname(file).toLowerCase()],
      "Content-Length": body.byteLength,
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    reply(response, 404, "Not found", request.method);
  }
}).listen(port, "127.0.0.1", () => console.log(`Portfolio ready at http://localhost:${port}`));
