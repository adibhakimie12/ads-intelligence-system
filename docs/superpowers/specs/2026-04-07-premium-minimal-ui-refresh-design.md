# Premium Minimal UI Refresh Design

- Date: 2026-04-07
- Product: Ads Intelligence System (`ads-intelligence-system`)
- Design mode: Editorial Command Center
- Approved style: Warm luxury minimal
- Navigation: Top bar
- Density: Relaxed

## 1. Problem Statement

Current pages are visually crowded and inconsistent in spacing, typography rhythm, and section hierarchy. The user requested a clean, premium, minimalist experience while preserving all existing information and functionality.

## 2. Goals

1. Keep all current information, metrics, controls, and workflows.
2. Make every page easier to scan and use with consistent visual hierarchy.
3. Eliminate spacing collisions (padding/margin clashes, cramped clusters).
4. Improve wrapping/readability for long names and descriptions.
5. Establish a shared visual system so all pages feel cohesive.

## 3. Non-Goals

1. No feature removals.
2. No data model changes.
3. No behavioral rewrites of analytics/business logic.
4. No route/navigation model change away from top-bar navigation.

## 4. Chosen Approach

Selected approach: **A - Global Design System Refresh**.

Why:
- Best quality-to-risk balance.
- Enables consistency across Dashboard, Insights, Creatives, Campaigns, Profit, Leads, Settings.
- Avoids heavy structural rewrite while still delivering significant polish.

## 5. Architecture and Layout System

### 5.1 Global Page Shell

Implement a shared shell pattern for all pages:
1. Intro block: section label, page title, concise description, primary action.
2. KPI strip: summary cards with unified spacing/padding/typography.
3. Main content sections: predictable grid patterns (`1-column` or `2-column` based on content).
4. Secondary/support blocks: alerts, tips, and utility actions in reduced visual weight.

### 5.2 Top Navigation Refinement

- Keep fixed top bar.
- Simplify spacing and active-state emphasis.
- Normalize button sizes and hit areas.
- Reduce visual competition between nav pills, profile menu, and notifications.

### 5.3 Section Rhythm

Define a relaxed vertical rhythm:
- Larger section gaps between major blocks.
- Consistent internal card spacing tiers.
- Reduced edge-to-edge crowding at large widths.
- Cleaner responsive stacking behavior on mobile.

## 6. Visual Language

### 6.1 Color and Surfaces

- Preserve warm luxury direction (cream + charcoal + amber accents).
- Lower background and border noise to reduce visual fatigue.
- Keep accent usage intentional (status and CTAs), not everywhere.

### 6.2 Typography

- Keep existing font families.
- Reduce excessive uppercase usage to labels only.
- Increase body line-height for readability.
- Tighten headline hierarchy so titles are strong but calmer.

### 6.3 Components

Standardize card and control tokens:
- Radius consistency.
- Shadow depth consistency.
- Padding tiers consistency.
- Unified badge/chip styles.
- Unified form control sizing.

## 7. Content and Information Preservation

All existing data modules remain intact:
- KPI cards
- Tables
- Charts
- Priority queues
- Filters
- Modals and drawers
- Alert and empty states

Changes only affect presentation, hierarchy, spacing, and readability.

## 8. Text Wrapping and Collision Prevention

Rules:
1. Add max-width constraints for long paragraphs.
2. Apply safe wrapping/line-break handling for long campaign and creative names.
3. Increase row and content spacing in dense cards/tables.
4. Ensure tags/badges do not overlap title and meta text.

## 9. Responsive Behavior

- Keep full information availability on mobile.
- Convert dense multi-column areas into clean stacked flows at smaller breakpoints.
- Preserve touch-friendly control spacing.
- Prevent horizontal overflow in tables/cards where possible.

## 10. Data Flow and Integration Impact

No data-flow changes expected.
- Existing context providers (`DatabaseContext`, `WorkspaceContext`, `ThemeContext`) remain unchanged in behavior.
- Existing service-layer APIs and sync flows remain unchanged.
- UI refactor should be class/layout-level and compositional.

## 11. Error Handling and States

Visual handling improvements only:
- Loading states keep existing meaning, but with cleaner spacing/contrast.
- Empty states remain visible with less visual clutter.
- Alerts stay clear without dominating page hierarchy.
- Modal/drawer states keep behavior; improve header/body/footer separation.

## 12. Testing Strategy

### 12.1 Functional Safety

1. Verify no information was removed from each page.
2. Verify primary actions remain reachable and functional.
3. Verify filters/sorts/modals/drawers still work.

### 12.2 Visual and UX Validation

1. Check spacing rhythm consistency page-to-page.
2. Validate long-text wrapping in campaign/creative names.
3. Validate no collision/overflow at common breakpoints.
4. Validate readability contrast in light and dark themes.

### 12.3 Regression Checks

1. Run existing frontend tests.
2. Smoke test all pages manually for layout regressions.

## 13. Rollout Plan

1. Establish shared layout/spacing primitives.
2. Apply to top navigation and global shell.
3. Refactor page sections in this order:
   - Dashboard
   - Insights
   - Creatives
   - Campaigns
   - Profit
   - Leads
   - Settings
4. Run cross-page visual QA and regression checks.

## 14. Risks and Mitigations

1. Risk: visual regressions from wide-scope class updates.
   - Mitigation: incremental page-by-page rollout and QA after each page.
2. Risk: mobile overflow in data-dense blocks.
   - Mitigation: explicit wrap/stack rules and breakpoint checks.
3. Risk: inconsistent component styling between legacy and refreshed sections.
   - Mitigation: enforce shared tokens and reusable shell classes.

## 15. Acceptance Criteria

1. All existing information remains present.
2. Layout appears premium, minimalist, and easier to scan.
3. No visible spacing collisions.
4. Long text wraps cleanly without overlap.
5. Navigation and page actions remain easy to find and use.
6. Responsive behavior is clean on desktop and mobile.
