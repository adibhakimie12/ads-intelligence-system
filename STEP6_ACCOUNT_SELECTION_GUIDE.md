# Step 6: Meta Ad Account Selection

This step lets the customer choose which discovered Meta ad account becomes the workspace's primary account.

## What This Step Adds

- A backend route to select the primary Meta ad account for a workspace
- A frontend account picker inside Settings
- Primary account status stored on both:
  - `meta_ad_accounts.is_primary`
  - `meta_connections.connected_account_id`
  - `meta_connections.connected_account_name`

## Files Added

- [meta-select-account.js](/e:/ads-intel-system/ads-intelligence-system/api/meta-select-account.js)
- [STEP6_ACCOUNT_SELECTION_GUIDE.md](/e:/ads-intel-system/ads-intelligence-system/STEP6_ACCOUNT_SELECTION_GUIDE.md)

## Files Updated

- [metaIntegration.ts](/e:/ads-intel-system/ads-intelligence-system/src/services/metaIntegration.ts)
- [Settings.tsx](/e:/ads-intel-system/ads-intelligence-system/src/pages/Settings.tsx)

## User Flow

1. Customer connects Meta Ads through OAuth.
2. The system discovers all accessible ad accounts.
3. Settings shows those accounts as selectable cards.
4. Customer clicks one account.
5. Backend verifies the user is an owner or admin of the workspace.
6. The selected account becomes the workspace primary account.

## Authorization Rule

Only workspace `owner` and `admin` roles can change the primary Meta ad account.

## Why This Matters

After Step 5, the system knows which ad accounts exist.

After Step 6, the customer can choose which one should power:

- dashboard syncs
- reporting defaults
- future automation rules
- future scheduled jobs

## Expected Result

When an account is selected:

- the chosen card becomes `Primary`
- the workspace connection stores that account id and name
- future sync work can target the selected account by default

## Next Step

Step 7 should use the selected primary account to perform the first real data sync into `campaign_snapshots`.
