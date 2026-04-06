create table if not exists public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  system_name text not null default 'Ads Intelligence HQ',
  currency text not null default 'MYR',
  timezone text not null default 'GMT+08:00 Kuala Lumpur',
  attribution_window text not null default '7-day click, 1-day view',
  meta_pixel_enabled boolean not null default false,
  meta_conversions_enabled boolean not null default false,
  google_analytics_enabled boolean not null default false,
  google_tag_manager_enabled boolean not null default false,
  ai_assistant_enabled boolean not null default true,
  creative_analysis_enabled boolean not null default true,
  lead_generation_enabled boolean not null default true,
  warning_alerts_enabled boolean not null default true,
  low_ctr_alert_enabled boolean not null default true,
  high_cpm_alert_enabled boolean not null default false,
  roas_drop_alert_enabled boolean not null default true,
  daily_summary_alert_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_workspace_settings_updated_at on public.workspace_settings;
create trigger trg_workspace_settings_updated_at
before update on public.workspace_settings
for each row execute function public.set_updated_at();

alter table public.workspace_settings enable row level security;

drop policy if exists "workspace members can view workspace settings" on public.workspace_settings;
create policy "workspace members can view workspace settings"
on public.workspace_settings
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace owners and admins can manage workspace settings" on public.workspace_settings;
create policy "workspace owners and admins can manage workspace settings"
on public.workspace_settings
for all
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_settings.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_settings.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);
