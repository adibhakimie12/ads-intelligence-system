alter table public.leads
  add column if not exists external_source text,
  add column if not exists external_id text,
  add column if not exists external_form_id text,
  add column if not exists external_created_at timestamptz;

create unique index if not exists idx_leads_workspace_external_source_id
  on public.leads (workspace_id, external_source, external_id)
  where external_source is not null and external_id is not null;
