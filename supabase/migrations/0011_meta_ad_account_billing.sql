alter table public.meta_ad_accounts
  add column if not exists available_funds numeric,
  add column if not exists amount_spent numeric,
  add column if not exists daily_spending_limit numeric;
