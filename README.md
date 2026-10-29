# Fence Mate

Mobile-first fencing toolkit for the UK trade. The production site is deployed from the `main` branch to Netlify.

## Current stable-beta scope

- Fencing materials estimates, gate opening calculator, timber cutting calculator and netting roll calculator.
- Site checklist and jobs saved in the browser on the current device.
- Optional Supabase account login and cloud job sync.
- Optional AI Mate through a Netlify function.
- AVS lookup currently opens the supplier's public search page for manual price verification. It does **not** automatically retrieve live AVS prices in this beta.
- This beta does **not** include the later estimate PDF-export feature. Do not assume it is present after a beta rollback.

## Netlify configuration

Set these environment variables in Netlify when the related feature is required:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_ANON_KEY` **or** `SUPABASE_PUBLISHABLE_KEY`: public client key used by account login. These are alternatives; do not put a service/secret key in the browser.
- `SUPABASE_SECRET_KEY`: server-side key used only by the activity-tracking function. Never expose it to client-side code.
- `GEMINI_API_KEY`: server-side key for AI Mate.

Redeploy after changing environment variables. Guest calculations and local jobs should remain usable if optional account/AI services are not configured.

## Netlify functions

- `/.netlify/functions/auth-config` — returns the Supabase URL and public client key.
- `/.netlify/functions/track-activity` — consent-based activity tracking; GET is a health/configuration check only.
- `/.netlify/functions/ask-ai` — AI Mate.
- `/.netlify/functions/avs-prices` — validates the material query and returns the official AVS search link for manual verification.

There must be only one source file per function route. Keep the CommonJS `.js` handlers as the canonical handlers; do not add another `.mjs` file with the same basename.

## Supabase tables expected

Account job sync expects a `fence_mate_jobs` table with `user_id`, `job_id`, `data` and `updated_at`, a unique constraint on `(user_id, job_id)`, and row-level security policies restricting each row to its owner (`auth.uid() = user_id`). Activity tracking expects `fence_mate_activity`; keep that table private to the server-side tracking function.

## Release smoke-test checklist

After every production deploy, test on a phone:

1. Open the home screen and each calculator.
2. Build one materials estimate for each fence type; check that quantities are plausible and dimensions are verified before ordering.
3. Save a job, add notes, reopen it and reload the page to confirm local persistence.
4. Add a photo and save the job; confirm it remains visible after reopening.
5. Open an estimate, edit quantities/prices and check the total; share the estimate if the share control is available.
6. Test account login and cloud sync only if Supabase is configured.
7. Test AI Mate only if `GEMINI_API_KEY` is configured.
8. Confirm AVS opens the correct supplier search. Verify product size, VAT basis, delivery and current price manually before quoting.
9. Check browser console/Netlify function logs if a feature fails. Do not test experimental changes directly on production.

## Safety and accuracy

Calculator results are estimates, not a substitute for checking site dimensions, product specifications, structural requirements or local rules. Confirm the actual supplier product, VAT basis, stock and delivery before quoting or ordering. Never treat a guessed price as a supplier-confirmed price.
