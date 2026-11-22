# Sai Balaji Nagarajan — Portfolio

A small static portfolio built with semantic HTML, CSS, and native JavaScript modules. It has no framework or runtime dependencies; the content lives separately from the page templates. Visitor-facing files are in `public/`; the read-only Vercel API functions stay in `api/`.

## Run locally

Open a terminal in this folder and run:

```sh
node server.mjs
```

Then visit `http://localhost:4173`. Stop the server with Ctrl+C.

## Add a project

Add an object to `public/content/projects.js` with a unique `slug`, `title`, `category`, `status`, `summary`, `technologies`, `overview`, and `availableDetails`. The category filter and project detail view use this data automatically. Add a project-specific `systemMap`, `projectFocus`, `coreQuestion`, and `engineeringQuestions` to make the detail page a useful case-study scaffold. The map is a functional summary, not a substitute for a schematic. Link only diagrams or photographs you have permission to publish. If the status is unknown, keep it as `To confirm`.

## Add a journal entry

Add an entry to `public/content/articles.js` with `slug`, `title`, `category`, `date`, `intro`, and a `blocks` array. Link to it with `article.html?id=your-slug`. Supported block types are `heading` (`text`), `paragraph` (`text`), `code` (`code`), `list` (`items`), `image` (`src`, `alt`, optional `caption`), and `table` (`headers`, `rows`). The article template builds a table of contents and estimates reading time from the content.

After Supabase Auth is configured and your user ID is in `portfolio_admins`, use `/admin.html` to sign in and manage journal entries. The editor supports headings, bold, italic, underline, lists, links, and image/video uploads. Each save also writes a private `.txt` copy to Supabase Storage. There is no public sign-up form; database and Storage RLS remain the final write-access checks.

## Update your profile

Edit the relevant text in `public/index.html`. Replace the internship draft only after confirming the dates and responsibilities. Social links and a résumé download are omitted until URLs/files are supplied.

## Replace the workspace image

Replace `public/assets/workspace.png` with the new image, preserving its aspect ratio, or update the image path in `public/index.html`. The image is shown with `object-fit: contain` so it is not cropped or stretched.

## Deploy to Vercel

Commit the portfolio to a GitHub repository and import that repository into Vercel. Vercel can serve the static pages and the read-only handlers in `api/`. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` under the Vercel project's environment variables. A custom domain can be connected later. Until those values are set, the local project content remains the fallback.

## Supabase content storage

The initial schema is in `supabase/migrations/20261122_initial_schema.sql`; the journal Storage buckets and access policies are in `supabase/migrations/20261122_journal_editor_storage.sql`. The `/api/projects` and `/api/articles` routes read published records when Supabase is configured, and the site falls back to local content otherwise. See `supabase/README.md` for setup notes.

## Security

See [SECURITY.md](SECURITY.md) for the site's public-data rules, Supabase key guidance, and current safeguards. Never commit secrets or private project files to this repository.

## Details to confirm

- Project status for each résumé project.
- KritiLabs internship dates and public responsibilities.
- LinkedIn and YouTube URLs.
- Whether to add a résumé download, college details, and a first journal entry.
