# Fence Mate Supabase activity tracking

The Netlify function writes minimal usage events to `public.fence_mate_activity`.

## Setup
1. Run `supabase/schema.sql` in Supabase SQL Editor.
2. In Netlify environment variables, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
3. Redeploy the preview and test. Keep the secret key server-side; never put it in browser code or GitHub.

Only fixed event names and a simple feature label are accepted. Do not send job/customer text, photos, measurements, estimates, or AI prompts/responses. Review consent and privacy requirements before enabling telemetry for public users.
