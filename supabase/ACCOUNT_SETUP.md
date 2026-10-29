# Fence Mate account setup (required before account beta)

The account UI and sync code are in the app, but authentication will not work until the Supabase project is configured. Keep the existing production site unchanged until the preview passes the checks below.

## 1. Netlify environment variables

In Netlify, open the `stack-your-p-trading` site → Site configuration → Environment variables. Ensure these variables are set for the deploy context used by the preview:

- `SUPABASE_URL`: the Supabase project URL, e.g. `https://YOUR-PROJECT.supabase.co`
- `SUPABASE_ANON_KEY`: the project's publishable/anon key. This is designed for browser use with Row Level Security enabled.
- `SUPABASE_SECRET_KEY`: keep this server-side only for the activity function. Never put it in HTML or expose it to the browser.
- `GEMINI_API_KEY`: server-side key used by AI Mate.

Do not paste any secret key into GitHub, chat, or client-side code.

## 2. Create the account jobs table

Open the Supabase SQL Editor for the same project as `SUPABASE_URL`, then run the full contents of `supabase/accounts.sql`. This creates `public.fence_mate_jobs` and row-level security policies that restrict records to their owner.

## 3. Configure Supabase Auth

In Supabase Authentication settings:

- Enable Email as a sign-in provider.
- Set the site URL to the public app URL.
- Add both the Netlify deploy-preview URL and the final public app URL to the allowed redirect URLs. The preview URL currently used by PR #7 is `https://deploy-preview-7--stack-your-p-trading.netlify.app`.
- Decide whether email confirmation is required. If enabled, test the confirmation email before expecting sign-up to log in immediately.

## 4. Verify on the deploy preview

1. Open the preview URL, then More → Settings → Your account.
2. Create a test account with an email you can access and a unique password.
3. Complete email confirmation if enabled, then log in.
4. Save a test job and estimate. Confirm rows appear in `public.fence_mate_jobs`.
5. Log out and back in; confirm the job returns.
6. Open the same preview on a second browser/device and log in to confirm job sync.
7. Confirm one test account cannot see another account's rows.
8. Test password reset and set a new password.
9. Confirm photos are still local-only in this beta and are not expected to sync.

## Known beta limitations

- Photos remain on the device; only job records, notes and estimates sync.
- Subscription billing, paid plans and App Store distribution are not connected.
- Do not merge PR #7 into production until preview deployment and the account, calculator, AI and analytics checks have passed.
