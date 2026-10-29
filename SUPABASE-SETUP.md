# Fence Mate Supabase activity tracking

The Netlify function writes minimal usage events to `public.fence_mate_activity`.

- Run `supabase/schema.sql` in Supabase SQL Editor.
- Netlify environment variables: `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
- Keep the secret key server-side; never add it to browser code or commit it to GitHub.
- Events contain only fixed event names and a simple feature label. Do not send job/customer text, photos, measurements, estimates, or AI prompts/responses.
- Test a Netlify deploy preview and review consent/privacy before enabling telemetry for public users.
