# Workspace Schema Guide

This document covers Step 2 of the customer-ready SaaS build: the workspace and tenant data model.

The goal of this step is to introduce a real multi-tenant structure before building customer Meta OAuth.

## Why This Step Exists

Authentication alone is not enough.

A real SaaS needs a tenant boundary so that:

- one customer only sees their own data
- one workspace owns its own Meta connection
- future billing, sync jobs, and permissions can be scoped safely

That tenant boundary is the `workspace`.

## What Was Added In This Step

### App-Level Foundation

New workspace types were added in:

[types.ts](e:\ads-intel-system\ads-intelligence-system\src\types.ts)

These include:

- `Workspace`
- `WorkspaceMember`
- `MetaConnection`
- `WorkspaceRole`
- `MetaConnectionStatus`

New workspace context was added in:

[WorkspaceContext.tsx](e:\ads-intel-system\ads-intelligence-system\src\context\WorkspaceContext.tsx)

This currently provides:

- a demo workspace shape
- a current workspace object
- a current membership object
- a placeholder Meta connection state

It is intentionally lightweight for now so Step 3 can connect it to the real database later.

### Database Foundation

The Supabase migration was added here:

[0001_workspace_foundation.sql](e:\ads-intel-system\ads-intelligence-system\supabase\migrations\0001_workspace_foundation.sql)

This migration creates:

- enum types for plans, roles, connection status, and sync jobs
- `workspaces`
- `workspace_members`
- `meta_connections`
- `meta_ad_accounts`
- `campaign_snapshots`
- `insight_snapshots`
- `sync_jobs`
- RLS policies

## Core Entity Model

### `workspaces`

Represents a customer account or team.

Important fields:

- `id`
- `name`
- `slug`
- `plan_tier`
- `owner_user_id`

### `workspace_members`

Maps users into workspaces.

Important fields:

- `workspace_id`
- `user_id`
- `role`

Roles:

- `owner`
- `admin`
- `member`

### `meta_connections`

Represents the OAuth relationship between a workspace and Meta.

Important fields:

- `workspace_id`
- `meta_user_id`
- `access_token_encrypted`
- `token_expires_at`
- `scopes`
- `status`
- `last_synced_at`

### `meta_ad_accounts`

Stores customer-selected Meta ad accounts for a workspace.

Important fields:

- `workspace_id`
- `meta_connection_id`
- `meta_ad_account_id`
- `ad_account_name`
- `is_primary`

### `campaign_snapshots`

Stores normalized ad performance data by workspace and date.

This becomes the basis for:

- dashboard metrics
- campaigns tables
- historical reporting
- AI recommendations

### `insight_snapshots`

Stores insights generated for a workspace.

This becomes the basis for:

- system insights
- alerts
- recommendations

### `sync_jobs`

Tracks sync attempts and outcomes.

This becomes important for:

- manual sync status
- retry logic
- cron job monitoring

## Security Model

This step also introduces Row Level Security thinking.

The migration includes:

- RLS enabled on tenant tables
- helper function `is_workspace_member`
- read access for workspace members
- owner/admin management access where appropriate
- service-role-only write access for sync-driven snapshot tables

The principle is:

- customer users read only workspace-scoped data
- sensitive sync pipelines write through trusted backend/service role

## Why This Structure Matters

Without this schema:

- every customer would share one connection model
- data leaks would be more likely
- billing and permissions would be hard to enforce

With this schema:

- each workspace owns its own integration
- customers can connect their own Meta account later
- sync data becomes customer-specific
- future billing and roles become much easier

## What This Step Does Not Do Yet

This step does **not** yet:

- create workspaces in Supabase automatically
- sync workspace data from auth
- implement Meta OAuth
- write live snapshots to database
- let users switch between multiple real workspaces

Those are the next steps.

## Recommended Next Step

Step 3 should be:

- connect this workspace schema to Supabase for real
- create workspace records on signup
- create membership records for the first user
- load current workspace from the database instead of demo state

After that, Step 4 should be:

- build the customer-facing `Connect Meta Ads` OAuth flow

## Suggested Implementation Order From Here

1. Add Supabase SQL tables using the migration
2. Create signup trigger or app logic to create a workspace
3. Load `currentWorkspace` from Supabase in the frontend
4. Show real workspace name in navigation and settings
5. Add `meta_connections` CRUD through server routes
6. Build Meta OAuth callback flow

## Summary

Step 2 establishes the tenant foundation of the SaaS:

- app-level workspace types
- app-level workspace context
- Supabase schema for tenant data
- role model
- secure ownership boundaries

This is the minimum structure needed before customers can connect their own Meta Ads accounts safely.
