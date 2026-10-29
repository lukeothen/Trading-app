# Fence Mate public beta — release checklist

## Implemented in this branch
- `/beta.html`: responsive beta signup page with email, trade role, explicit opt-in and bot honeypot.
- `/.netlify/functions/beta-signup`: server-side validation and Supabase insert; no Supabase key in browser code; database errors are not exposed to visitors.
- `supabase/beta-signups.sql`: private waitlist table with row-level security enabled and no public policies.
- `/privacy.html`: privacy-information draft. It intentionally contains launch-blocking placeholders.

## Required before enabling public signup
1. Review and run `supabase/beta-signups.sql` in the correct Supabase project.
2. Confirm Netlify has `SUPABASE_URL` and `SUPABASE_SECRET_KEY` set for the deploy context. The key must remain server-side.
3. Complete `privacy.html` with the real controller name/contact, retention period and confirmed lawful basis; review data processing and access controls.
4. Deploy the branch as a preview and test valid signup, invalid email, missing consent, duplicate email, honeypot, and database unavailable behaviour.
5. Confirm the row appears in Supabase Table Editor; do not infer success from a successful frontend build alone.
6. Review abuse protection/rate limiting before promoting the form widely. The honeypot is only a basic bot deterrent, not a full rate limit.
7. Separately test core calculators against known cases, saved jobs, AI endpoint and mobile usability. User jobs/photos are currently stored in browser localStorage, not a cloud account; users can lose them when browser data is cleared or on another device.
8. Only merge into production after checks pass. Keep the existing live branch unchanged until then.

## Where to review beta requests
Supabase → Table Editor → `fence_mate_beta_signups`. Treat email addresses as personal data and restrict dashboard access to people who need it.
