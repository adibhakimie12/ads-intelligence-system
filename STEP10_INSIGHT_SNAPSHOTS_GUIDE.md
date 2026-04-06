# Step 10: Insight Snapshots

This step moves recommendations for real workspaces into the database by storing generated insights in `insight_snapshots`.

## What This Step Adds

- A backend insight engine used during real Meta syncs
- Insight rows written into `insight_snapshots`
- Real workspaces load stored insights from Supabase
- Demo mode keeps the lightweight client-side insight generation

## Files Added

- [insight-engine.js](/e:/ads-intel-system/ads-intelligence-system/api/_lib/insight-engine.js)
- [STEP10_INSIGHT_SNAPSHOTS_GUIDE.md](/e:/ads-intel-system/ads-intelligence-system/STEP10_INSIGHT_SNAPSHOTS_GUIDE.md)

## Files Updated

- [meta-sync.js](/e:/ads-intel-system/ads-intelligence-system/api/meta-sync.js)
- [metaIntegration.ts](/e:/ads-intel-system/ads-intelligence-system/src/services/metaIntegration.ts)
- [DatabaseContext.tsx](/e:/ads-intel-system/ads-intelligence-system/src/context/DatabaseContext.tsx)

## Behavior

### Real workspace

1. Customer runs a live Meta sync.
2. Backend fetches campaign data.
3. Backend generates insights from those campaigns.
4. Backend replaces the workspace's old `insight_snapshots`.
5. Frontend loads those persisted insight rows from Supabase.

### Demo mode

- insights are still generated on the client from seeded demo campaigns

## Why This Matters

Before this step:

- real workspaces read campaign snapshots from the database
- but insights were still mostly a client-side derivation

After this step:

- recommendations are stored alongside synced data
- the product behaves more like a real SaaS analytics system
- insight history can be expanded later with real retention logic

## Next Step

Step 11 should push more derived business data into storage too, such as profit summaries or workspace-level dashboard aggregates.
