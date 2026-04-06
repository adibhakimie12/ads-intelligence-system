create table if not exists public.workspace_daily_summaries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  summary_date date not null,
  provider text not null default 'meta',
  total_spend numeric(12,2) not null default 0,
  total_revenue numeric(12,2) not null default 0,
  total_conversions integer not null default 0,
  average_ctr numeric(8,2) not null default 0,
  average_cpm numeric(12,2) not null default 0,
  roas numeric(8,2) not null default 0,
  profit_margin numeric(8,2) not null default 0,
  campaign_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, summary_date, provider)
);

drop trigger if exists trg_workspace_daily_summaries_updated_at on public.workspace_daily_summaries;
create trigger trg_workspace_daily_summaries_updated_at
before update on public.workspace_daily_summaries
for each row execute function public.set_updated_at();

alter table public.workspace_daily_summaries enable row level security;

drop policy if exists "workspace members can read daily summaries" on public.workspace_daily_summaries;
create policy "workspace members can read daily summaries"
on public.workspace_daily_summaries
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "service role manages daily summaries" on public.workspace_daily_summaries;
create policy "service role manages daily summaries"
on public.workspace_daily_summaries
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
