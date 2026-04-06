# Step 14: Google Provider Summaries

## What This Step Adds

Step 14 extends the real workspace data flow so Google Ads can participate in provider-aware summary history.

This step adds:

- a workspace-authenticated Google sync endpoint
- Google summary writes into `workspace_daily_summaries`
- multi-provider summary aggregation in the frontend
- combined same-day top-line metrics for Meta + Google

## Files Added

- `api/google-sync.js`
- `STEP14_GOOGLE_PROVIDER_SUMMARIES_GUIDE.md`

## Files Updated

- `src/services/metaIntegration.ts`
- `src/context/DatabaseContext.tsx`
- `src/pages/Dashboard.tsx`

## Backend Flow

The new `POST /api/google-sync` route:

1. verifies the signed-in Supabase user
2. confirms they belong to the requested workspace
3. creates a `sync_jobs` row for provider `google`
4. fetches Google campaign data through the existing ads helper
5. builds a Google summary row
6. upserts that summary into `workspace_daily_summaries`
7. marks the sync job as `success` or `failed`

## Frontend Flow

`DatabaseContext` now:

- calls the real Google sync route for real workspaces
- stops mixing real workspaces with the old Google demo fetch path during sync
- aggregates summary rows by `summary_date`
- combines same-day Meta and Google summary rows into one top-level `workspaceSummary`

This means the dashboard metrics now represent the latest full workspace total for that day, not just a single provider row.

## History Behavior

`workspaceSummaryHistory` is now treated as aggregated-by-date history for the UI.

That gives us:

- cleaner dashboard forecast input
- multi-provider daily totals
- better alignment with the provider filter already added on Campaigns

## Important Limitation

This step makes Google part of workspace summary history, but it does **not** yet make Google fully parallel to Meta.

Google still does **not** have:

- customer OAuth
- Google account selection
- Google campaign snapshot persistence in `campaign_snapshots`
- Google insight snapshot persistence

So this step should be understood as:

- `summary-level multi-provider support`: yes
- `full Google workspace data model`: not yet

## Why This Step Matters

Before this step:

- Google sync for real workspaces still behaved like a demo fetch
- dashboard-level summary history could only reflect one provider row at a time

After this step:

- Google can contribute to stored workspace daily summaries
- same-day provider rows roll up into one workspace-level total
- the trend system is better prepared for a future full Google integration

## Verification

Production build verification:

```bash
npm run build
```

Result: build passes successfully.

## Recommended Next Step

Step 15 should decide how far Google support should go next.

The strongest next option is:

- add a real Google Ads connection architecture plan and schema path

That would cover:

- Google OAuth
- Google account linkage
- Google snapshot persistence
- Google insight generation
- true reload-safe multi-provider campaign data
