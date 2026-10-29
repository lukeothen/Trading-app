# Fence Mate — Supabase activity tracking

This integration records a small set of anonymous product-usage events through the Netlify Function `/.netlify/functions/track-activity`.

## 1. Create the table

In the Supabase dashboard for your existing project, open **SQL Editor**, create a query, paste the contents of `supabase/schema.sql`, and run it. It creates `public.fence_mate_activity` if it does not already exist.

## 2. Configure Netlify

In your Netlify site, open **Site configuration → Environment variables** (the wording may vary) and add:

- `SUPABASE_URL`: your project's Project URL.
- `SUPABASE_SECRET_KEY`: the project's secret key. This stays on the server and must never be added to `index.html`, committed to GitHub, or shared in chat.

If your project only shows a legacy `service_role` key, treat it as equally sensitive. Use the server-side secret key option available in your Supabase project. Redeploy after changing environment variables so the function receives them.

## 3. Test safely

Deploy a preview from this branch, open it on your phone, and try a calculation, AI request, and save action. Then in Supabase **Table Editor → fence_mate_activity**, confirm rows appear. The event metadata should contain only an allow-listed event type and a simple feature label. It must not contain customer/job text, photos, measurements, estimate values, AI prompts or responses.

If rows do not appear, check Netlify Function logs for `track-activity` and verify both environment variables and the table name. The app should still work if analytics is unavailable.

## Privacy note

This is lightweight usage telemetry, not a customer/job database. The current client calls do not request consent before sending events; add an explicit consent choice and privacy notice before enabling analytics for public users. Keep the event payload minimal and set a retention policy before public launch.
