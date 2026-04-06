alter table public.meta_connections
  add column if not exists access_token_iv text,
  add column if not exists access_token_auth_tag text,
  add column if not exists token_encryption_version integer not null default 1,
  add column if not exists access_token_hint text,
  add column if not exists connected_account_id text,
  add column if not exists connected_account_name text;

alter table public.meta_ad_accounts
  add column if not exists account_status text,
  add column if not exists account_currency text;

update public.meta_connections
set connected_account_id = null
where connected_account_id is null;

update public.meta_connections
set connected_account_name = null
where connected_account_name is null;

create unique index if not exists idx_meta_ad_accounts_primary_per_workspace
  on public.meta_ad_accounts (workspace_id)
  where is_primary = true;
