create table if not exists public.creative_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_platform text not null default 'meta',
  origin text not null default 'synced',
  creative_name text not null,
  campaign_name text,
  campaign_external_id text,
  adset_name text,
  ad_name text,
  creative_external_id text,
  media_type text not null default 'image',
  preview_url text,
  thumbnail_url text,
  hook_type text,
  status text not null default 'TESTING',
  score numeric(5,2) not null default 0,
  ctr numeric(8,2) not null default 0,
  roas numeric(8,2) not null default 0,
  spend numeric(12,2) not null default 0,
  hook_strength numeric(5,2) not null default 0,
  message_clarity numeric(5,2) not null default 0,
  cta_presence numeric(5,2) not null default 0,
  fatigue text not null default 'low',
  analysis_summary text not null default '',
  ai_verdict text,
  suggestions jsonb not null default '[]'::jsonb,
  snapshot_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creative_snapshots_workspace_snapshot_idx
  on public.creative_snapshots (workspace_id, snapshot_date desc, source_platform);

create index if not exists creative_snapshots_workspace_origin_idx
  on public.creative_snapshots (workspace_id, origin, created_at desc);

drop trigger if exists trg_creative_snapshots_updated_at on public.creative_snapshots;
create trigger trg_creative_snapshots_updated_at
before update on public.creative_snapshots
for each row execute function public.set_updated_at();

alter table public.creative_snapshots enable row level security;

drop policy if exists "workspace members can read creative snapshots" on public.creative_snapshots;
create policy "workspace members can read creative snapshots"
on public.creative_snapshots
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "owners and admins can manage uploaded creative snapshots" on public.creative_snapshots;
create policy "owners and admins can manage uploaded creative snapshots"
on public.creative_snapshots
for all
using (
  public.is_workspace_admin_or_owner(workspace_id)
  and origin = 'uploaded'
)
with check (
  public.is_workspace_admin_or_owner(workspace_id)
  and origin = 'uploaded'
);

drop policy if exists "service role manages creative snapshots" on public.creative_snapshots;
create policy "service role manages creative snapshots"
on public.creative_snapshots
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
