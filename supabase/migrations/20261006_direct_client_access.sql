-- 20261006_direct_client_access.sql
-- The Expo app now talks to Supabase directly (no serverless layer), so these
-- changes close the gaps the old server used to cover and fix a capacity bug.

-- 1. Fix: deactivating a member while the household is at capacity used to
--    fail, because the old trigger counted the row being updated. The new
--    version skips inactive rows and excludes the row itself from the count.
create or replace function public.enforce_household_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  household_limit smallint;
  member_count integer;
begin
  if not new.active then
    return new;
  end if;
  if new.role = 'admin' then
    select max_admins into household_limit from public.households where id = new.household_id;
  else
    select max_renters into household_limit from public.households where id = new.household_id;
  end if;
  select count(*) into member_count
  from public.profiles
  where household_id = new.household_id and role = new.role and active and id <> new.id;
  if member_count >= household_limit then
    raise exception 'Household % has reached its % capacity', new.household_id, new.role;
  end if;
  return new;
end;
$$;

-- 2. Members can update their own profile row (to edit their display name).
--    The trigger below stops non-admins from touching privileged columns.
create policy "members update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_role public.member_role;
begin
  select role into caller_role from public.current_profile();
  if caller_role is distinct from 'admin' then
    if new.id is distinct from old.id
       or new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.household_id is distinct from old.household_id
       or new.username is distinct from old.username
       or new.email is distinct from old.email then
      raise exception 'Only household admins can change role, status, username, email, or household.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns_trigger
before update on public.profiles
for each row execute function public.protect_profile_columns();

-- 3. Renters can only submit payments for bills in their own household.
drop policy if exists "renters submit own payments" on public.payments;
create policy "renters submit own payments" on public.payments
  for insert with check (
    renter_id = auth.uid()
    and bill_id in (
      select id from public.bills
      where household_id = (select household_id from public.current_profile())
    )
  );

-- 4. Admins write audit entries straight from the app now.
create policy "admins add audit entries" on public.audit_log
  for insert with check (
    actor_id = auth.uid()
    and household_id = (select household_id from public.current_profile())
    and (select role from public.current_profile()) = 'admin'
  );
