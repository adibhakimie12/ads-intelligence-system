# Step 5: Token Security and Account Discovery

This step hardens the Meta connection flow so customer tokens are no longer stored in plain text, and the app starts discovering available ad accounts immediately after OAuth succeeds.

## What This Step Adds

- Server-side token encryption before saving the Meta access token
- Encryption metadata stored with the workspace connection
- Automatic Meta profile lookup after OAuth
- Automatic ad account discovery after OAuth
- `meta_ad_accounts` rows populated for the workspace
- Primary account auto-selection when only one account is returned

## Files Added

- [token-crypto.js](/e:/ads-intel-system/ads-intelligence-system/api/_lib/token-crypto.js)
- [meta-graph.js](/e:/ads-intel-system/ads-intelligence-system/api/_lib/meta-graph.js)
- [0003_meta_connection_security.sql](/e:/ads-intel-system/ads-intelligence-system/supabase/migrations/0003_meta_connection_security.sql)

## Files Updated

- [meta-callback.js](/e:/ads-intel-system/ads-intelligence-system/api/meta-callback.js)
- [WorkspaceContext.tsx](/e:/ads-intel-system/ads-intelligence-system/src/context/WorkspaceContext.tsx)
- [Settings.tsx](/e:/ads-intel-system/ads-intelligence-system/src/pages/Settings.tsx)
- [types.ts](/e:/ads-intel-system/ads-intelligence-system/src/types.ts)
- [.env.example](/e:/ads-intel-system/ads-intelligence-system/.env.example)

## New Environment Variable

```env
META_TOKEN_ENCRYPTION_KEY=
```

Use either:
- a raw 32-character string, or
- a base64 value that decodes to 32 bytes

This key must be set:
- locally in `.env`
- in Vercel project environment variables

## Database Migration

Apply this migration before testing Step 5:

- [0003_meta_connection_security.sql](/e:/ads-intel-system/ads-intelligence-system/supabase/migrations/0003_meta_connection_security.sql)

It adds:
- `access_token_iv`
- `access_token_auth_tag`
- `token_encryption_version`
- `access_token_hint`
- `connected_account_id`
- `connected_account_name`
- `account_status`
- `account_currency`

## How The Flow Works Now

1. Customer clicks `Connect Meta`.
2. OAuth completes.
3. Backend exchanges the code for an access token.
4. Backend encrypts the token using `META_TOKEN_ENCRYPTION_KEY`.
5. Backend fetches the customer Meta profile.
6. Backend fetches all accessible ad accounts.
7. Backend saves the encrypted token and account list.
8. If there is exactly one ad account, it becomes the primary account automatically.

## Why This Matters

Before this step:
- token storage was only a placeholder
- the app knew a connection existed, but not which customer ad accounts were available

After this step:
- the token is stored in an encrypted form
- the workspace has real discovered Meta accounts to use in the next step

## Still Not Included Yet

This step does not yet include:

- decrypting and using the token for scheduled sync jobs
- customer-facing account picker UI
- token refresh handling
- disconnect/revoke flow

Those come next.
