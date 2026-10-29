# Fence Mate Supabase activity tracking

This branch is based on `Selector`, the newer dark-green/lime design.

- Run `supabase/schema.sql` in Supabase SQL Editor.
- Netlify environment variables: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
- Keep the secret key server-side; never add it to browser code or commit it to GitHub.
- Events contain only allow-listed event names and simple feature labels. Never send job/customer text, photos, measurements, estimates, or AI prompts/responses.
- Test the Netlify deploy preview and confirm rows arrive in Supabase before merging.
