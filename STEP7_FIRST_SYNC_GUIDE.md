# Step 7: First Real Meta Sync

This step introduces the first real workspace-level sync into `campaign_snapshots`.

## What This Step Adds

- A secure backend route to sync the selected primary Meta ad account
- Access token decryption on the server
- Campaign insights fetched from Meta Graph
- Snapshot rows written into `campaign_snapshots`
- Sync job records written into `sync_jobs`
- Immediate UI refresh with the synced campaign data

## Files Added

- [meta-sync.js](/e:/ads-intel-system/ads-intelligence-system/api/meta-sync.js)
- [STEP7_FIRST_SYNC_GUIDE.md](/e:/ads-intel-system/ads-intelligence-system/STEP7_FIRST_SYNC_GUIDE.md)

## Files Updated

- [token-crypto.js](/e:/ads-intel-system/ads-intelligence-system/api/_lib/token-crypto.js)
- [meta-graph.js](/e:/ads-intel-system/ads-intelligence-system/api/_lib/meta-graph.js)
- [metaIntegration.ts](/e:/ads-intel-system/ads-intelligence-system/src/services/metaIntegration.ts)
- [Settings.tsx](/e:/ads-intel-system/ads-intelligence-system/src/pages/Settings.tsx)

## User Flow

1. Customer connects Meta Ads.
2. Customer chooses the primary ad account.
3. Customer clicks `Sync Live Meta`.
4. Backend decrypts the saved Meta token.
5. Backend fetches campaign insights for the selected account.
6. Backend stores a new snapshot set for today in `campaign_snapshots`.
7. Backend updates `meta_connections.last_synced_at`.
8. Frontend updates the current campaign view using the synced results.

## Data Stored

For each campaign, the system stores:

- `campaign_external_id`
- `campaign_name`
- `spend`
- `ctr`
- `cpm`
- `roas`
- `conversions`
- `revenue`
- `snapshot_date`

## Sync Jobs

Each sync creates a `sync_jobs` row and updates it to:

- `running`
- `success`
- or `failed`

This gives you a basic audit trail for future monitoring and cron-based syncs.

## Expected Result

After Step 7:

- real Meta campaign data is written to the database
- the workspace knows when it was last synced
- the UI can immediately show the synced campaigns

## Next Step

Step 8 should load `campaign_snapshots` as the source of truth for the dashboard and campaign views, instead of relying mainly on static seed data.
