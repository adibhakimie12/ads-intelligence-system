# Step 8: Campaign Snapshots as Source of Truth

This step moves the dashboard and campaign data layer onto `campaign_snapshots` for real workspaces.

## What This Step Changes

- Real workspaces now load campaign data from Supabase snapshots
- Demo mode still uses the seeded mock/demo flow
- Shared Meta sync actions now use the workspace-aware sync path automatically
- The UI updates from stored snapshots instead of relying mainly on hardcoded campaign seed data

## Files Updated

- [DatabaseContext.tsx](/e:/ads-intel-system/ads-intelligence-system/src/context/DatabaseContext.tsx)

## Behavior

### In demo mode

- the app still syncs with the mock/demo behavior
- seeded demo data remains available

### In a real workspace

- the app queries `campaign_snapshots`
- it picks the latest `snapshot_date`
- it maps those rows into the existing `AdsData` shape
- dashboard and campaign views render from that latest snapshot set

## Why This Matters

After Step 7, data was being written to the database.

After Step 8, the product actually reads that stored data back as the primary campaign dataset for the workspace.

That means the app is now behaving more like a real SaaS:

- sync writes data
- dashboard reads data
- the database becomes the main source of truth

## Fallback Behavior

If a real workspace has no snapshots yet:

- campaign data is empty until the first sync is run

That is expected and is more accurate than showing unrelated seed data for a real customer workspace.

## Next Step

Step 9 should extend this pattern to:

- insight generation from snapshots
- profit calculations from synced data
- better empty states for newly connected but not-yet-synced workspaces
