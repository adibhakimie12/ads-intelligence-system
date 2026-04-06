# Step 13: Grouped History and Provider-Aware Trends

This step improves trend-chart fidelity for longer date ranges and prepares the reporting layer for multi-provider history.

## What This Step Adds

- Weekly grouping for `30D` trend views
- Monthly grouping for `90D` trend views
- Provider-aware trend filtering (`All`, `Meta`, `Google`)
- Empty-state messaging when a provider has no stored summary history yet

## Files Updated

- [Campaigns.tsx](/e:/ads-intel-system/ads-intelligence-system/src/pages/Campaigns.tsx)
- [STEP13_GROUPED_HISTORY_GUIDE.md](/e:/ads-intel-system/ads-intelligence-system/STEP13_GROUPED_HISTORY_GUIDE.md)

## Why This Matters

Before this step:

- `7D`, `30D`, and `90D` were all effectively reading raw daily rows
- the chart structure was not ready for multi-provider summary history

After this step:

- `7D` stays daily
- `30D` becomes weekly grouped
- `90D` becomes monthly grouped
- users can switch the trend view between all providers and provider-specific history

## Current Behavior

### If history exists

- the chart uses `workspaceSummaryHistory`
- longer ranges are grouped instead of showing a long list of daily bars

### If history does not exist

- demo/static fallback remains available for the general empty-history case
- provider-specific empty states explain that no summaries exist yet for that provider

## Next Step

Step 14 should start writing Google provider summaries too, so the provider filter becomes fully populated in real use.
