alter table public.meta_ad_accounts
  add column if not exists manual_available_funds numeric;
