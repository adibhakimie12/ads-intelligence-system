create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(input text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  output text;
begin
  output := lower(trim(coalesce(input, 'workspace')));
  output := regexp_replace(output, '[^a-z0-9]+', '-', 'g');
  output := regexp_replace(output, '(^-+|-+$)', '', 'g');

  if output = '' then
    output := 'workspace';
  end if;

  return output;
end;
$$;

alter table public.insight_snapshots
  add column if not exists campaign_external_id text,
  add column if not exists campaign_name text;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  source text not null,
  campaign text not null,
  value numeric(12,2) not null default 0,
  status text not null default 'new',
  lead_score text not null default 'medium',
  insight text not null default '',
  recommended_action text not null default '',
  notes text,
  creative_name text not null default '',
  creative_type text not null default 'image',
  hook_tag text,
  adset_name text,
  quality_score text not null default 'medium',
  ctr numeric(8,2) not null default 0,
  cpl numeric(12,2) not null default 0,
  conversion_rate numeric(8,2) not null default 0,
  lead_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

drop policy if exists "workspace members can read leads" on public.leads;
create policy "workspace members can read leads"
on public.leads
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace members can read lead activities" on public.lead_activities;
create policy "workspace members can read lead activities"
on public.lead_activities
for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "owners and admins can manage leads" on public.leads;
create policy "owners and admins can manage leads"
on public.leads
for all
using (public.is_workspace_admin_or_owner(workspace_id))
with check (public.is_workspace_admin_or_owner(workspace_id));

drop policy if exists "owners and admins can manage lead activities" on public.lead_activities;
create policy "owners and admins can manage lead activities"
on public.lead_activities
for all
using (public.is_workspace_admin_or_owner(workspace_id))
with check (public.is_workspace_admin_or_owner(workspace_id));
