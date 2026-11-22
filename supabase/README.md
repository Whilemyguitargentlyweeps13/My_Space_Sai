# Supabase setup

The portfolio uses Supabase Postgres for project and journal records. Supabase Storage holds journal image/video uploads and private `.txt` copies of saved posts.

For a new Supabase project:

1. Run `migrations/20261122_initial_schema.sql` in the Supabase SQL Editor.
2. Run `migrations/20261122_journal_editor_storage.sql` in the SQL Editor. This creates the storage buckets and locks writes to the allowlisted owner.
3. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the Vercel project's Environment Variables.
4. In Supabase Authentication, turn off new user signups. Create the owner login, then add its user UUID to `public.portfolio_admins` (the SQL example is at the end of the initial schema migration).
5. Open `/admin.html` on the site. Sign in, write a post, use the toolbar for formatting, and choose **IMAGE** or **VIDEO** to upload media. Saving creates a private `.txt` copy; publishing makes the post visible on the site.

If the initial schema is already installed, run only the second migration now. It is safe to run again if needed. Text copies are saved in a predictable private path based on the post slug (`slug/slug.txt`).

The `portfolio-journal-media` bucket is public so visitors can view images and videos embedded in published posts. Media URLs are accessible as soon as they are uploaded, including while a post is a draft, so upload only files you are ready to share. Only an allowlisted portfolio admin can upload, update, or delete media. The `portfolio-journal-text` bucket is private; only an allowlisted admin can access the `.txt` copies. Uploaded media is limited to 15 MB per image and 50 MB per video by the editor; the storage bucket also enforces its 50 MB maximum.

Never put a Supabase `service_role` or secret key in browser code, Git, or Vercel's public variables. The admin editor uses the publishable key plus the signed-in owner's short-lived access token; database and Storage RLS policies enforce admin-only writes.

Docker is not a file host for this Vercel app. Keep public project reports in GitHub or Supabase Storage and store their links in the database.
