# Step 4: Meta OAuth Connect Flow

This step turns the Meta integration from a hardcoded demo state into a real workspace-level OAuth connection flow.

## What This Step Adds

- A `Connect Meta Ads` button in Settings
- A secure backend route to start Meta OAuth
- A backend callback route to save the connection to the current workspace
- Success and error feedback after the user returns from Meta
- Environment variable placeholders for local and Vercel setup

## Files Added

- [meta-connect.js](/e:/ads-intel-system/ads-intelligence-system/api/meta-connect.js)
- [meta-callback.js](/e:/ads-intel-system/ads-intelligence-system/api/meta-callback.js)
- [meta-oauth.js](/e:/ads-intel-system/ads-intelligence-system/api/_lib/meta-oauth.js)
- [supabase-admin.js](/e:/ads-intel-system/ads-intelligence-system/api/_lib/supabase-admin.js)
- [metaIntegration.ts](/e:/ads-intel-system/ads-intelligence-system/src/services/metaIntegration.ts)

## Files Updated

- [Settings.tsx](/e:/ads-intel-system/ads-intelligence-system/src/pages/Settings.tsx)
- [.env.example](/e:/ads-intel-system/ads-intelligence-system/.env.example)

## User Flow

1. User signs in and has an active workspace.
2. User opens `Settings`.
3. User clicks `Connect Meta Ads`.
4. Frontend calls `/api/meta-connect` with the Supabase session token.
5. Backend verifies the user belongs to the workspace.
6. Backend returns a Meta OAuth URL.
7. Browser redirects to Meta.
8. User authorizes access.
9. Meta redirects back to `/api/meta-callback`.
10. Backend exchanges the code for an access token.
11. Backend upserts the `meta_connections` row for that workspace.
12. User is redirected back to the app with a success or error banner.

## Required Environment Variables

Add these locally in `.env` and in Vercel project environment variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=
META_POST_CONNECT_REDIRECT=
```

### Notes

- `META_REDIRECT_URI` must point to your callback route.
- Local example:
  - `http://localhost:3000/api/meta-callback`
- Vercel example:
  - `https://your-project.vercel.app/api/meta-callback`
- `META_POST_CONNECT_REDIRECT` is where the app should send users after connection.
- Good default:
  - `https://your-project.vercel.app/settings`

## Meta App Setup

In your Meta app settings:

1. Add your callback URL to the allowed redirect URIs.
2. Make sure the app can request the permissions you need.
3. Use the same `META_REDIRECT_URI` in your env vars.

## Supabase Requirements

This step expects these tables and signup automation from the earlier steps:

- `workspaces`
- `workspace_members`
- `meta_connections`

Make sure these migrations are already applied:

- [0001_workspace_foundation.sql](/e:/ads-intel-system/ads-intelligence-system/supabase/migrations/0001_workspace_foundation.sql)
- [0002_signup_workspace_bootstrap.sql](/e:/ads-intel-system/ads-intelligence-system/supabase/migrations/0002_signup_workspace_bootstrap.sql)

## Current Scope

This step only covers connection state.

It does not yet include:

- ad account selection
- token encryption at rest
- token refresh logic
- background syncing
- campaign snapshot ingestion

Those come in the next steps.

## Testing Checklist

1. Start the app locally.
2. Sign up or sign in with a real Supabase-backed account.
3. Open `Settings`.
4. Click `Connect Meta Ads`.
5. Complete the Meta auth flow.
6. Confirm you return to the app with a success banner.
7. Confirm `meta_connections.status = connected` for that workspace.

## Expected Result

After Step 4, each workspace can begin a real Meta connection instead of relying on a shared demo state.
