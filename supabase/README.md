# Supabase setup

This project is prepared for Supabase, but it is not connected to a Supabase project yet.

1. Create a Supabase project.
2. Run `migrations/20261122_initial_schema.sql` in the Supabase SQL Editor.
3. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the Vercel project environment variables, using the names in `.env.example`.
4. In Supabase Authentication settings, disable new user signups. Create your own email/password user in Authentication → Users, then add that user's UUID to `public.portfolio_admins` using the commented SQL at the end of the migration.
5. Add a file row to `public.project_files` for each report, schematic, or image. The table stores a URL or storage path and metadata, never the binary file.
6. Open `/admin.html` on the deployed site and sign in with that allowlisted account to create, edit, and publish journal entries. The page keeps the access token in memory only; refresh the page to sign in again.

The default `storage_provider` is `github` for public, versioned project assets. Commit public PDFs, diagrams, and images to a public GitHub repository, then store their HTTPS URL in `project_files.file_url`. Keep private drafts out of a public repository. For private assets, use a private Supabase Storage bucket and store its object path; serve it through an authenticated, short-lived signed URL. The public site only renders public file URLs.

The `anon` key is intended for browser-side public reads when Row Level Security is configured. Never put a `service_role` key in browser code, Git, or a public repository. Use server-side environment variables for privileged operations.

When the Vercel environment variables are present, the public pages read published records through the read-only `/api/projects` and `/api/articles` routes. Before that, the pages continue to use `content/projects.js` and `content/articles.js`. The Supabase Dashboard Table Editor can be the first private editing surface; a custom admin panel can be added later. Docker is not a file host for this Vercel app: Vercel Functions have read-only filesystems with only temporary `/tmp` space.
