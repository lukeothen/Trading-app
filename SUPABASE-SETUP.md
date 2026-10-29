# Fence Mate — Supabase analytics setup

This branch adds optional, anonymous feature-usage analytics. It does **not** sync saved jobs or collect customer/job content.

## 1. Create a Supabase project
1. Create a project in Supabase.
2. Open **SQL Editor**, paste and run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the **Project URL** and the **publishable key** (a legacy `anon` key is also supported).

## 2. Configure the static app
Edit `supabase-config.js` and fill in `url` and `publishableKey`. These are browser-side public values. **Never use a service-role or secret key in the website.**

The app does not send analytics until a visitor opts in through the consent prompt. Choosing **Not now** disables tracking for that browser. Events contain only an allow-listed event name, a random browser session UUID and limited metadata such as a tool section. The app does not send AI prompts/replies, job names/notes, customer details, photos, measurements or estimate values.

## 3. Deploy and verify
1. Deploy the branch preview to Netlify.
2. Open the preview in a private browser session.
3. Opt in, open a tool and run a calculation.
4. In Supabase **Table Editor → app_events**, verify that event rows arrive.
5. Test **Not now** in a fresh session and confirm no rows are created.

## Important privacy/security notes
- The publishable key is intended for browser use only because Row Level Security is enabled and the policy allows only inserts of allow-listed, small analytics events. Public visitors cannot select, update or delete rows through the Data API.
- This is lightweight prototype analytics, not a complete abuse-prevention system. Before public launch, add a retention/deletion policy, update the privacy notice, assess UK GDPR/PECR requirements for your use case, and consider server-side ingestion/rate limiting.
- This only tracks feature usage. It does not make jobs available across devices; that requires Supabase Auth plus separate user-owned tables and Row Level Security.
