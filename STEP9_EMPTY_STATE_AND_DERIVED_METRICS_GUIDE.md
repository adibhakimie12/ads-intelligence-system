# Step 9: Empty States and Derived Campaign Health

This step improves the real-workspace UX once the app starts reading from `campaign_snapshots`.

## What This Step Adds

- Derived campaign `status` and `recommendation` from live metrics
- A shared `needsFirstSync` state for real workspaces
- Better empty states in Dashboard, Campaigns, and Profit pages

## Files Updated

- [DatabaseContext.tsx](/e:/ads-intel-system/ads-intelligence-system/src/context/DatabaseContext.tsx)
- [Dashboard.tsx](/e:/ads-intel-system/ads-intelligence-system/src/pages/Dashboard.tsx)
- [Campaigns.tsx](/e:/ads-intel-system/ads-intelligence-system/src/pages/Campaigns.tsx)
- [Profit.tsx](/e:/ads-intel-system/ads-intelligence-system/src/pages/Profit.tsx)

## Why This Was Needed

After Step 8, real workspaces correctly loaded snapshot data.

But snapshot rows do not carry the earlier demo-only status fields, so some UI summaries lost meaning unless we derive them from performance metrics.

## Derived Logic

The system now infers campaign health from live metrics:

- `ROAS >= 3` -> `scaling`
- `ROAS < 1.5` -> `underperforming`
- `CTR < 1` -> `testing`
- `CPM > 25` -> `testing`
- otherwise -> `active`

Recommendations are also derived from the same metrics.

## Empty State Behavior

If a workspace is real, configured, and has no campaign snapshots yet:

- Dashboard explains that the first sync is still needed
- Campaigns explains why the table is empty
- Profit explains that live summary cards need synced data

This is much more accurate than showing unrelated seeded data to a real customer workspace.

## Result

After Step 9:

- synced data feels more complete in the UI
- lifecycle summaries work with real snapshots
- newly connected workspaces have professional empty states instead of confusing blanks

## Next Step

Step 10 should persist generated insights into `insight_snapshots` so recommendations can also become database-backed instead of only client-generated.
