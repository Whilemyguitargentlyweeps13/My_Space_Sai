# Security and privacy notes

This portfolio is a public website. It has no contact form, login for visitors, analytics, or visitor-submitted data. It is designed to display public project and journal content; it is not a place to store passwords, API secrets, private reports, or personal records.

## Current safeguards

- There are no advertising, analytics, or tracking scripts in the site. Bodoni Moda is bundled locally, and the Content Security Policy permits scripts, styles, and fonts only from this site.
- The public site exposes only the read-only `GET` handlers in `api/`. Those handlers request published Supabase rows, cap response size and row count, validate returned content, and include no write operations.
- The private journal editor has no sign-up flow. It verifies the signed-in user's ID against `portfolio_admins`; database RLS independently rejects writes by every other account. Access tokens stay in page memory and are not saved in browser storage.
- Supabase access uses a publishable key on the server side. The API helper rejects other key formats. Keep Row Level Security enabled and never use a secret or `service_role` key in this project.
- The Supabase migration enables RLS and limits public reads to published content and public files. Do not publish a row until its text and links are safe for anyone to read.
- Project file links and journal image links must use HTTPS. Store only assets intended for public access in the public GitHub repository.
- `.env` and `.env.*` files are ignored by Git except `.env.example`, which contains placeholders. Add real values only in Vercel's environment settings.
- Vercel response headers set a restrictive Content Security Policy, prevent framing and MIME sniffing, limit referrer detail, and disable unused browser permissions.
- The local preview server serves only files in `public/`, binds to loopback, and blocks dotfiles, repository metadata, configuration files, and unsupported HTTP methods.

## Before connecting Supabase

1. Run the migration in a new Supabase project and confirm RLS is enabled on every exposed table.
2. Set only `SUPABASE_URL` and the `sb_publishable_...` key in Vercel. Do not add a database password, secret API key, or `service_role` key.
3. Disable new signups in Supabase Auth, create your own Auth user, and add only your own user ID to `portfolio_admins`.
4. Keep private reports in a private storage bucket. Public GitHub links, public bucket links, and published database rows can be copied by anyone.
5. Enable multi-factor authentication on your GitHub, Vercel, and Supabase dashboard accounts, and review their connected apps periodically.

No site can be guaranteed bug-proof or immune to every intrusion. These controls reduce common risks; continue to keep dependencies and account access reviewed and avoid entering private information into public content.
