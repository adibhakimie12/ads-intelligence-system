# System Architecture And Wireframes

This document maps the current Ads Intelligence System end to end:

- frontend page structure
- context and state ownership
- server/API flows
- Supabase tables and relationships
- wireframe intent for each page
- current logic connections
- known gaps and issues

## 1. System Overview

The app is a multi-tenant ad-ops workspace built around:

- `Auth`: Supabase auth for sign in, sign up, and Google OAuth
- `Workspace`: one or more workspaces per user
- `Data Sync`: Meta Ads live read/sync, Google demo sync
- `Decision Layer`: campaign recommendations, insight generation, creative and lead-quality signals
- `Operator UI`: dashboard, insights, campaigns, creatives, leads, profit, settings

High-level shape:

```text
Browser UI
  -> AuthContext
  -> WorkspaceContext
  -> DatabaseContext
  -> Page Components

Browser UI
  -> Supabase client
    -> auth
    -> workspace reads
    -> snapshots / settings / summaries

Browser UI
  -> API routes
    -> Meta OAuth / account selection / sync
    -> Google demo sync

API routes
  -> Supabase service role
  -> Meta Graph API
  -> token crypto helpers
```

## 2. Frontend Architecture

Root entry:

- `src/main.tsx`
  - mounts app
  - wraps app with:
    - `AuthProvider`
    - `WorkspaceProvider`
    - `DatabaseProvider`

App shell:

- `src/App.tsx`
  - decides whether to show:
    - loading
    - auth screen
    - workspace required state
    - onboarding
    - main app shell
  - page switching is local via `currentPage` from `DatabaseContext`

### Context Ownership

#### `AuthContext`

File:

- `src/context/AuthContext.tsx`

Responsibilities:

- Supabase session bootstrap
- email/password sign in
- sign up with `workspace_name`
- Google OAuth sign in
- sign out
- demo mode toggle

Inputs:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Outputs:

- `user`
- `session`
- `isConfigured`
- `isDemoMode`

#### `WorkspaceContext`

File:

- `src/context/WorkspaceContext.tsx`

Responsibilities:

- load user memberships
- load workspace list
- load `meta_connections`
- load `meta_ad_accounts`
- choose active workspace

Reads from Supabase:

- `workspace_members`
- `workspaces`
- `meta_connections`
- `meta_ad_accounts`

Outputs:

- `currentWorkspace`
- `currentMembership`
- `metaConnection`
- `metaAdAccounts`
- `refreshWorkspaceData`

#### `DatabaseContext`

File:

- `src/context/DatabaseContext.tsx`

Responsibilities:

- current page state
- campaign data
- creative data
- insights
- leads
- workspace summaries
- sync actions
- currency formatting
- local managed campaign creation

Reads from:

- `campaign_snapshots`
- `insight_snapshots`
- `workspace_daily_summaries`
- local demo data
- localStorage custom campaigns

Calls:

- `syncPrimaryMetaAccount`
- `syncWorkspaceGoogleAds`
- `fetchMetaAds`
- `fetchGoogleAds`

Outputs:

- `adsData`
- `creatives`
- `insights`
- `leads`
- `workspaceSummary`
- `workspaceSummaryHistory`
- `createCampaign`

## 3. Backend Architecture

API route families:

- Meta OAuth
  - `api/meta-connect.js`
  - `api/meta-callback.js`
  - `api/meta-select-account.js`
  - `api/meta-sync.js`

- Google
  - `api/google-sync.js`
  - `api/google-ads.js`

- legacy/demo reads
  - `api/meta-ads.js`

Shared helpers:

- `api/_lib/meta-oauth.js`
- `api/_lib/meta-graph.js`
- `api/_lib/token-crypto.js`
- `api/_lib/supabase-admin.js`
- `api/_lib/insight-engine.js`
- `api/_lib/ads.js`

### Meta Flow

```text
Settings page
  -> beginMetaConnection()
  -> /api/meta-connect
  -> Meta OAuth URL
  -> /api/meta-callback
  -> save encrypted token + ad accounts in Supabase
  -> select primary account
  -> /api/meta-select-account
  -> sync
  -> /api/meta-sync
  -> Meta Graph insights
  -> campaign_snapshots + insight_snapshots + workspace_daily_summaries + sync_jobs
```

### Google Flow

Current state:

- `google-sync` is demo-backed
- not true Google Ads OAuth write/read parity yet

Result:

- good enough for UI and summaries
- not real production integration yet

## 4. Database Architecture

Base schema:

- `workspaces`
- `workspace_members`
- `meta_connections`
- `meta_ad_accounts`
- `campaign_snapshots`
- `insight_snapshots`
- `sync_jobs`

Added later:

- `workspace_daily_summaries`
- `workspace_settings`
- Meta security columns:
  - `access_token_iv`
  - `access_token_auth_tag`
  - `token_encryption_version`
  - `access_token_hint`
  - `connected_account_id`
  - `connected_account_name`
  - ad account metadata columns

### Core Relationships

```text
auth.users
  -> workspaces.owner_user_id

workspaces
  -> workspace_members.workspace_id
  -> meta_connections.workspace_id
  -> meta_ad_accounts.workspace_id
  -> campaign_snapshots.workspace_id
  -> insight_snapshots.workspace_id
  -> sync_jobs.workspace_id
  -> workspace_daily_summaries.workspace_id
  -> workspace_settings.workspace_id

meta_connections
  -> meta_ad_accounts.meta_connection_id
```

### Security Model

RLS is enabled on all operational tables.

Access helper functions:

- `public.is_workspace_member(uuid)`
- `public.is_workspace_admin_or_owner(uuid)`

Patterns:

- members can read
- owners/admins can manage workspace-scoped configuration
- service role manages snapshots, sync jobs, summaries

## 5. Page Wireframes

## Dashboard

File:

- `src/pages/Dashboard.tsx`

Purpose:

- operator command center
- campaign creation
- scale / pause / stop decisions
- winning creative signals
- lead quality winner

Wireframe:

```text
Header
  Title
  New Campaign button

Priority Queue
  top 3 insights

Core Metrics
  spend / revenue / roas / ctr

Campaign Command Center
  Scale Now
  Pause & Repair
  Stop Spending

Side Signals
  Winning Creative
  Creative Risk
  Quality Lead Winner

Creative Summary Metrics
  win rate
  avg CPM
  quality lead engine

Active Campaigns Table

Forecast Area
  profit forecast
  top revenue driver
  creative efficiency watch
```

Connections:

- `adsData`
- `insights`
- `leads`
- `workspaceSummary`
- `workspaceSummaryHistory`
- `createCampaign`

## Insights

File:

- `src/pages/Insights.tsx`

Purpose:

- explain what action should happen next
- show evidence behind the decision

Wireframe:

```text
Header
  title
  live insight count

Summary Cards
  action queue
  scale opportunities
  creative issues
  lead quality warnings

Main Two-Column Area
  Left: Priority Queue
  Right: Evidence Panel + Quick Signals

Category Filters
  all / ads / creative / funnel / sales

Category Grid
  insight cards with campaign / creative / lead evidence preview
```

Connections:

- `insights`
- `adsData`
- `creatives`
- `leads`

Current matching logic:

- insight text to campaign name matching
- creative and lead linkage derived from campaign name

## Campaigns

File:

- `src/pages/Campaigns.tsx`

Purpose:

- operational table and trend history

Wireframe:

```text
Header
  filters / export

KPI Cards
  spend / revenue / roas / ctr

Trend Chart
  time range + provider filters

Lifecycle Summary
  scaling / testing / underperforming / paused

Campaign Table

Sidebar
  growth opportunities
  system status
```

Connections:

- `adsData`
- `workspaceSummary`
- `workspaceSummaryHistory`

## Creatives

File:

- `src/pages/Creatives.tsx`

Purpose:

- creative quality board

Wireframe:

```text
Header
  filter / upload

Creative Summary
  top performer
  creative fatigue
  weak hooks

Creative Grid
  preview image
  status badge
  hook/message/cta scores
  fatigue indicator

Footer CTA
```

Connections:

- `creatives`

Current state:

- mostly local/demo creative data
- not yet sourced from real Meta creative objects

## Leads

Files:

- `src/pages/Leads.tsx`
- `src/components/LeadCard.tsx`
- `src/components/LeadDetailsDrawer.tsx`

Purpose:

- lead pipeline and quality review

Expected wireframe:

```text
Header
  usage / filters / upgrade state

Alert strip
  pipeline alerts

Lead grid
  source
  campaign
  creative attribution
  quality
  insight
  status actions

Details drawer
  notes
  status
  quality reasoning
```

Connections:

- `leads`
- `pipelineAlerts`
- `updateLead`

Current state:

- strong local workflow
- not yet connected to CRM / WhatsApp / actual lead source backend

## Profit

File:

- `src/pages/Profit.tsx`

Purpose:

- unit economics calculator

Current role:

- standalone business calculator
- not deeply integrated with campaign snapshots yet

## Settings

File:

- `src/pages/Settings.tsx`

Purpose:

- workspace settings
- Meta connection
- ad account selection
- sync actions
- local AI key settings

Wireframe:

```text
Header + workspace state

General Settings

Ads Integrations
  Meta connect
  Google demo sync
  primary account selection
  sync buttons

Tracking & Analytics

AI Assistant

Real-Time Alerts

Bottom action bar
  save / discard
```

Connections:

- `workspace_settings`
- `meta_connections`
- `meta_ad_accounts`
- sync APIs

## 6. Logic And Connection Matrix

### Auth -> Workspace

- `signUp()` sends `workspace_name` in auth metadata
- DB trigger in `0002_signup_workspace_bootstrap.sql` creates:
  - workspace
  - owner membership
  - placeholder meta connection

### Workspace -> Settings

- active workspace controls:
  - which Meta connection is shown
  - which ad accounts are listed
  - which settings record is loaded

### Settings -> Meta Sync

- connect Meta
- callback saves token and accounts
- select primary account
- sync account

### Meta Sync -> Dashboard / Campaigns / Insights

- sync stores:
  - campaign snapshots
  - insight snapshots
  - daily summaries
  - sync job rows

- frontend reads those rows via Supabase

### Leads -> Dashboard / Insights

- dashboard derives quality lead winner
- insights uses lead evidence panel

### Custom Managed Campaigns

- created in dashboard
- stored in localStorage per workspace
- merged with synced campaign data in `DatabaseContext`

Important:

- this is app-level management
- not yet real write-back to Meta campaign creation API

## 7. Main Issues Found

### 1. Insight linkage is text-based

Current problem:

- Insights are matched back to campaigns using message text and campaign names.

Impact:

- brittle
- breaks if names change
- weak evidence linking

Recommended fix:

- add `campaign_external_id` to `insight_snapshots`
- persist it during insight generation and sync
- use ID-based linking in frontend

### 2. Creative data is not truly integrated with Meta

Current problem:

- `Creatives` page uses local/demo creative objects
- not sourced from Meta ad creative endpoints

Impact:

- creative scorecards are not backed by real asset-level data

Recommended fix:

- add `creative_snapshots` table
- pull ad / ad creative / thumbnail / asset signals from Meta
- attach campaign/ad/creative IDs

### 3. New campaign is not write-back to Meta

Current problem:

- dashboard campaign creation stores local managed campaigns only

Impact:

- useful for operator workflow
- not true campaign publishing

Recommended fix:

- add `POST /api/meta-create-campaign`
- validate owner/admin membership
- require selected Meta account
- create campaign in Meta Graph API
- persist result into local DB

### 4. Google integration is still demo-level

Current problem:

- `google-sync` is not a full OAuth/live integration

Impact:

- cross-channel reporting is mixed real/demo

Recommended fix:

- add Google OAuth and live read pipeline

### 5. Routing is local-state driven

Current problem:

- page navigation uses `currentPage` in context
- no URL routing

Impact:

- deep linking is not available
- refresh state is weaker

Recommended fix:

- migrate to `react-router`

### 6. Plan/billing logic is UI-only

Current problem:

- plan tier and lead limit are local state in `App.tsx`

Impact:

- not enforceable across sessions/users

Recommended fix:

- move plan data into workspace record or billing tables

### 7. Lead pipeline is local-only

Current problem:

- leads are not stored in Supabase

Impact:

- no multi-user persistence

Recommended fix:

- create `leads` and `lead_activities` tables

### 8. Function hardening still has small remaining security lint

Observed:

- `set_updated_at`
- `slugify`

Recommended fix:

- define explicit `search_path`

## 8. Recommended Next Build Order

1. `Insight identity repair`
- add stable IDs to insight rows

2. `Real creative architecture`
- add creative snapshot table and Meta creative sync

3. `Leads persistence`
- move lead data into Supabase

4. `Meta campaign write-back`
- create real campaign API route

5. `Google parity`
- move Google from demo to real integration

6. `Routing + URL state`
- replace context-only page switching

## 9. Final Architecture Summary

The system already has a solid base:

- auth and workspace tenancy exist
- Meta connection and sync are real
- snapshots, insights, summaries, and settings are wired
- dashboard and insights now behave more like real operator surfaces

The biggest gaps are:

- real creative-level integration
- real campaign write-back to Meta
- persistent leads
- stronger insight identity linking
- Google live parity
