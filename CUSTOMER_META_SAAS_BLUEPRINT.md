# Customer Meta Ads SaaS Blueprint

This document explains how to evolve the current Ads Intelligence system from a demo-style app into a real multi-customer SaaS where each customer can connect their own Meta Ads account.

The goal is to move from:

- one app
- one shared backend
- one owner-level Meta connection or demo data

to:

- many customers
- many workspaces
- each workspace connects its own Meta Ads account
- each customer only sees their own data

## 1. Current State

Right now the project works like a prototype:

- frontend is deployed on Vercel
- API falls back to demo/mock data if Meta credentials are missing
- Meta connection is controlled by server environment variables
- there is no customer login flow for connecting their own account

This means:

- you can connect one global owner account
- customers cannot securely connect their own Meta Ads account yet

## 2. Target State

The target SaaS flow should look like this:

1. Customer signs up
2. Customer creates or joins a workspace
3. Customer opens `Settings > Integrations`
4. Customer clicks `Connect Meta Ads`
5. Customer authorizes via Meta OAuth
6. Customer chooses the ad account(s) to connect
7. The app stores the token securely for that workspace
8. Dashboard and insights show only that workspace’s data

## 3. Recommended Stack

Recommended production stack for the customer-ready version:

- `Next.js`
- `Vercel`
- `Supabase Auth`
- `Supabase Postgres`
- optional `Vercel Cron Jobs` for scheduled syncs

Why:

- `Supabase Auth` gives you email/password auth, sessions, JWTs, and solid support for user management
- `Supabase Postgres` gives structured data storage and Row Level Security
- `Vercel` works well for frontend, serverless routes, and cron jobs
- `Next.js` makes auth, server routes, and production SaaS flows easier than a pure static frontend plus ad hoc backend

## 4. Product Model

Use this core product model:

- `User` = a person who can log in
- `Workspace` = a company/account/team using the product
- `Workspace Member` = user membership inside a workspace
- `Meta Connection` = Meta OAuth token and account linkage stored per workspace

Recommended MVP restrictions:

- one customer = one workspace
- one workspace can connect one Meta account at first
- one selected ad account per workspace
- manual sync first
- scheduled sync later

## 5. Step-by-Step Build Plan

### Step 1. Freeze the prototype

Keep the current Vite app as a working prototype reference.

Recommended:

- create a branch like `prototype-static-demo`
- do not rely on the current local mock architecture for long-term customer SaaS

### Step 2. Define MVP rules

Before coding, lock these decisions:

- can a customer connect one ad account or many
- is sync manual or automatic in MVP
- is there one workspace per customer or many
- are customers invited by members or self-serve only
- which plan limitations apply

Recommended MVP:

- one workspace per customer
- one Meta connection
- one selected ad account
- manual sync only

### Step 3. Add authentication

Implement login and signup first.

Recommended starting auth:

- email + password
- magic link optional later
- Google login optional later

What users need after login:

- create workspace
- join workspace
- go through onboarding

### Step 4. Add workspace model

Every authenticated user must belong to at least one workspace.

This is important because all data access later must be scoped by `workspace_id`.

### Step 5. Create the database schema

Minimum tables:

- `users`
- `workspaces`
- `workspace_members`
- `meta_connections`
- `meta_ad_accounts`
- `campaign_snapshots`
- `insight_snapshots`
- `sync_jobs`

Every business record should include:

- `workspace_id`

This is the foundation of multi-tenant safety.

### Step 6. Turn on authorization rules

Use database-level access control so users can only access records in workspaces they belong to.

If using Supabase:

- enable RLS on all tenant-scoped tables
- write policies for read/write by workspace membership

### Step 7. Build customer-facing integration UI

Replace the current fake connected state in Settings with real integration states:

- `Connect Meta Ads`
- `Connected`
- `Last Sync`
- `Reconnect`
- `Disconnect`
- `Choose Ad Account`

### Step 8. Implement Meta OAuth

This is the core integration flow.

Flow:

1. customer clicks `Connect Meta Ads`
2. backend creates Meta authorization URL
3. customer signs in to Meta
4. Meta redirects back to your callback URL
5. backend exchanges the `code` for an access token
6. backend stores the token securely for that workspace

Important:

- Meta app secret stays server-side only
- frontend should never hold permanent Meta tokens

### Step 9. Store tokens securely

Tokens must be stored:

- server-side
- encrypted at rest if possible
- linked to `workspace_id`
- with metadata such as expiry and granted scopes

Do not store tokens in:

- localStorage
- sessionStorage
- client state
- public env vars

### Step 10. Let the customer choose their ad account

Many customers have multiple Meta ad accounts.

After OAuth:

- fetch available ad accounts from Meta
- show a selection UI
- save selected accounts under `meta_ad_accounts`

Recommended MVP:

- allow customer to select only one ad account first

### Step 11. Replace shared API logic with workspace-aware API routes

The API must stop using one global server token.

New API logic should:

1. verify logged-in user
2. resolve workspace membership
3. load that workspace’s Meta token
4. fetch or read data only for that workspace

Every request must be customer-specific.

### Step 12. Build manual sync first

First usable version:

- user clicks `Sync Now`
- server fetches campaign data from Meta
- server normalizes the response
- server stores snapshot rows in the database
- dashboard reads the stored rows

This is much easier to debug than background automation first.

### Step 13. Add dashboard data from database

Stop using local demo state as the main source of truth.

Instead:

- fetch workspace summary
- fetch snapshots
- fetch insights
- render those results in the UI

### Step 14. Add reconnect and failure handling

You need real states for:

- token expired
- permission removed
- app disconnected
- no ad account selected
- sync failed
- API limit or permission errors

These should be visible to customers in the UI.

### Step 15. Add scheduled sync later

Once manual sync is stable:

- create a scheduled sync route
- use cron to sync active workspaces
- protect cron endpoint with a secret

Recommended later, not first.

### Step 16. Add billing after integration is stable

Billing should be introduced after auth, workspace scoping, and Meta connection all work.

Suggested SaaS limits:

- Free:
  - one connected ad account
  - limited lookback window
  - manual sync only
  - basic insights
- Pro:
  - scheduled sync
  - AI recommendations
  - automation rules
  - deeper analytics

## 6. Recommended MVP Scope

To ship faster, version 1 should only include:

- authentication
- one workspace per customer
- one Meta connection
- one selected ad account
- manual sync
- dashboard backed by stored snapshots

Do not build all of this at once:

- Google Ads
- multi-account switching
- agency/multi-client management
- advanced automations
- background sync retries
- deep billing logic

Those can come after the Meta MVP works.

## 7. Suggested Database Tables

These are the recommended starting tables:

### `users`

Purpose:

- identity for each logged-in user

Example fields:

- `id`
- `email`
- `created_at`

### `workspaces`

Purpose:

- tenant/account boundary

Example fields:

- `id`
- `name`
- `owner_user_id`
- `plan_tier`
- `created_at`

### `workspace_members`

Purpose:

- maps users to workspaces

Example fields:

- `id`
- `workspace_id`
- `user_id`
- `role`
- `created_at`

### `meta_connections`

Purpose:

- stores Meta OAuth connection per workspace

Example fields:

- `id`
- `workspace_id`
- `meta_user_id`
- `access_token_encrypted`
- `token_expires_at`
- `scopes`
- `status`
- `created_at`
- `updated_at`

### `meta_ad_accounts`

Purpose:

- stores customer-selected ad accounts

Example fields:

- `id`
- `workspace_id`
- `meta_connection_id`
- `meta_ad_account_id`
- `ad_account_name`
- `is_primary`
- `created_at`

### `campaign_snapshots`

Purpose:

- stores campaign data pulled from Meta

Example fields:

- `id`
- `workspace_id`
- `meta_ad_account_id`
- `campaign_external_id`
- `campaign_name`
- `spend`
- `ctr`
- `cpm`
- `roas`
- `conversions`
- `revenue`
- `snapshot_date`
- `created_at`

### `insight_snapshots`

Purpose:

- stores generated platform insights

Example fields:

- `id`
- `workspace_id`
- `type`
- `severity`
- `message`
- `reasoning`
- `created_at`

### `sync_jobs`

Purpose:

- logs manual and scheduled sync attempts

Example fields:

- `id`
- `workspace_id`
- `provider`
- `status`
- `started_at`
- `finished_at`
- `error_message`

## 8. Security Rules

These rules are non-negotiable for a real SaaS:

- never expose Meta app secret to frontend
- never store long-lived tokens in client code
- scope all reads and writes by `workspace_id`
- verify workspace membership on every API route
- encrypt sensitive tokens at rest if possible
- log connection, disconnect, and sync activity

## 9. Customer Experience Flow

This is what the final customer flow should feel like:

1. User signs up
2. User names workspace
3. User lands on onboarding
4. User clicks `Connect Meta Ads`
5. User completes Meta authorization
6. User selects ad account
7. User clicks `Sync Now`
8. Dashboard populates with their own campaign data

That is the first moment the product becomes truly customer-ready.

## 10. Recommended Build Order

Build in this order:

1. Authentication
2. Workspace system
3. Database and RLS
4. Real Settings integration UI
5. Meta OAuth routes
6. Secure token storage
7. Ad account picker
8. Manual sync pipeline
9. Dashboard from DB
10. Reconnect and failure states
11. Cron-based sync
12. Billing and plan enforcement

## 11. What Not To Do First

Avoid starting with:

- automation rules
- AI recommendation engines
- Google Ads integration
- multi-client agency mode
- advanced billing
- complex dashboards

Those features become much easier after auth + workspace + Meta connection are already working.

## 12. Best Practical Recommendation

Use the current app as:

- UI foundation
- product prototype
- layout reference

But for a true customer SaaS, shift the architecture toward:

- auth-backed user sessions
- workspace-based tenancy
- database-backed data
- OAuth-driven customer connections

## 13. Best Next Technical Step

If implementing this, the next best practical task is:

- design the exact database schema, or
- design the exact Meta OAuth routes and callback flow

Recommended next order:

1. database schema
2. auth integration
3. workspace onboarding
4. Meta connect button + callback
5. manual sync

## 14. Final Summary

Current state:

- demo/prototype
- owner-level connection only
- customers cannot connect their own account

Target state:

- real SaaS
- each customer has a workspace
- each workspace connects its own Meta Ads account with OAuth
- tokens stored securely
- dashboard shows only that customer’s data

The fastest path to a real customer-ready version is:

- auth
- workspace system
- database
- Meta OAuth
- manual sync

Everything else can layer on top of that.
