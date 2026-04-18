-- Add missing profile columns
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists organization text;

-- Allow authenticated users to insert their own profile row (needed on first sign-up)
create policy if not exists "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
