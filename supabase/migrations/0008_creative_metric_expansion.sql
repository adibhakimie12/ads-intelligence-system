alter table public.creative_snapshots
  add column if not exists impressions numeric(12,2),
  add column if not exists link_ctr numeric(8,2),
  add column if not exists link_clicks numeric(12,2),
  add column if not exists cost_per_link_click numeric(12,2),
  add column if not exists cost_per_result numeric(12,2),
  add column if not exists target_cpl numeric(12,2),
  add column if not exists max_cpl numeric(12,2),
  add column if not exists hook_rate numeric(8,4),
  add column if not exists video_views_3s numeric(12,2),
  add column if not exists video_views_25 numeric(12,2),
  add column if not exists video_views_50 numeric(12,2),
  add column if not exists video_views_75 numeric(12,2);
