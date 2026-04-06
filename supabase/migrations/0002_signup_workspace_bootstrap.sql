create or replace function public.slugify(input text)
returns text as $$
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
$$ language plpgsql immutable;

create or replace function public.handle_new_user_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_name text;
  workspace_slug text;
  final_slug text;
  workspace_id uuid;
begin
  workspace_name := coalesce(new.raw_user_meta_data->>'workspace_name', split_part(new.email, '@', 1) || ' Workspace');
  workspace_slug := public.slugify(workspace_name);
  final_slug := workspace_slug;

  while exists (select 1 from public.workspaces where slug = final_slug) loop
    final_slug := workspace_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
  end loop;

  insert into public.workspaces (name, slug, plan_tier, owner_user_id)
  values (workspace_name, final_slug, 'free', new.id)
  returning id into workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'owner');

  insert into public.meta_connections (workspace_id, status)
  values (workspace_id, 'not_connected');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_workspace on auth.users;
create trigger on_auth_user_created_workspace
  after insert on auth.users
  for each row execute procedure public.handle_new_user_workspace();

drop policy if exists "authenticated users can create workspaces" on public.workspaces;
create policy "authenticated users can create workspaces"
on public.workspaces
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "owners can create their own membership" on public.workspace_members;
create policy "owners can create their own membership"
on public.workspace_members
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "owners and admins can manage ad accounts" on public.meta_ad_accounts;
create policy "owners and admins can manage ad accounts"
on public.meta_ad_accounts
for all
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = meta_ad_accounts.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = meta_ad_accounts.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  )
);
