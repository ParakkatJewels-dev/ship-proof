-- Who may sign in to the ShipProof dashboard, and what they may do.
-- Accounts themselves live in Supabase Auth (auth.users). This table adds a display name and a role.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'PACKER' check (role in ('ADMIN', 'PACKER')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in person may read their own profile. The API reads every profile with the service key,
-- which bypasses these rules, and nobody can change a role from the browser.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

-- Every new account gets a PACKER profile. Promote someone with:
--   update public.profiles set role = 'ADMIN' where id = '<user id>';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
