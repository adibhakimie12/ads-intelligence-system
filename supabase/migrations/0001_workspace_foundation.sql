create extension if not exists "pgcrypto";

create type public.plan_tier as enum ('free', 'pro');
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.meta_connection_status as enum ('not_connected', 'connected', 'expired', 'error');
create type public.sync_job_status as enum ('queued', 'running', 'success', 'failed');

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan_tier public.plan_tier not null default 'free',
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.meta_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces(id) on delete cascade,
  meta_user_id text,
  access_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status public.meta_connection_status not null default 'not_connected',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  meta_connection_id uuid not null references public.meta_connections(id) on delete cascade,
  meta_ad_account_id text not null,
  ad_account_name text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, meta_ad_account_id)
);

create table if not exists public.campaign_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  meta_ad_account_id text not null,
  campaign_external_id text not null,
  campaign_name text not null,
  spend numeric(12,2) not null default 0,
  ctr numeric(8,2) not null default 0,
  cpm numeric(12,2) not null default 0,
  roas numeric(8,2) not null default 0,
  conversions integer not null default 0,
  revenue numeric(12,2) not null default 0,
  snapshot_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.insight_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null,
  severity text not null,
  message text not null,
  reasoning text not null,
  priority text not null,
  action text,
  action_label text,
  platform text,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null,
  status public.sync_job_status not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_workspaces_updated_at on public.workspaces;
create trigger trg_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists trg_meta_connections_updated_at on public.meta_connections;
create trigger trg_meta_connections_updated_at
before update on public.meta_connections
for each row execute function public.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.meta_connections enable row level security;
alter table public.meta_ad_accounts enable row level security;
alter table public.campaign_snapshots enable row level security;
alter table public.insight_snapshots enable row level security;
alter table public.sync_jobs enable row level security;

create or replace function public.is_workspace_member(check_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = check_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin_or_owner(check_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = check_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

drop policy if exists "workspace members can view workspaces" on public.workspaces;
create policy "workspace members can view workspaces"
on public.workspaces
for select
using (public.is_workspace_member(id));

drop policy if exists "workspace owners can update workspaces" on public.workspaces;
create policy "workspace owners can update workspaces"
on public.workspaces
for update
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "workspace members can view memberships" on public.workspace_members;
create policy "workspace members can view memberships"
on public.workspace_members
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "owners and admins can manage memberships" on public.workspace_members;
create policy "owners and admins can manage memberships"
on public.workspace_members
for all
using (public.is_workspace_admin_or_owner(workspace_id))
with check (public.is_workspace_admin_or_owner(workspace_id));

drop policy if exists "workspace members can view meta connections" on public.meta_connections;
create policy "workspace members can view meta connections"
on public.meta_connections
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace owners and admins can manage meta connections" on public.meta_connections;
create policy "workspace owners and admins can manage meta connections"
on public.meta_connections
for all
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = meta_connections.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = meta_connections.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);

drop policy if exists "workspace members can read tenant data" on public.meta_ad_accounts;
create policy "workspace members can read tenant data"
on public.meta_ad_accounts
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace members can read campaign snapshots" on public.campaign_snapshots;
create policy "workspace members can read campaign snapshots"
on public.campaign_snapshots
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "service role manages campaign snapshots" on public.campaign_snapshots;
create policy "service role manages campaign snapshots"
on public.campaign_snapshots
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "workspace members can read insight snapshots" on public.insight_snapshots;
create policy "workspace members can read insight snapshots"
on public.insight_snapshots
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "service role manages insight snapshots" on public.insight_snapshots;
create policy "service role manages insight snapshots"
on public.insight_snapshots
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "workspace members can read sync jobs" on public.sync_jobs;
create policy "workspace members can read sync jobs"
on public.sync_jobs
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "service role manages sync jobs" on public.sync_jobs;
create policy "service role manages sync jobs"
on public.sync_jobs
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
