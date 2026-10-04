-- Run this once against an existing Supabase project before deploying the designated-account flow.
alter table public.profiles add column if not exists username text;

update public.profiles
set username = lower(split_part(email, '@', 1))
where username is null;

alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_key unique (username);
alter table public.profiles add constraint profiles_username_format check (username ~ '^[a-z0-9][a-z0-9_-]{2,31}$');
