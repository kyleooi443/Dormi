create extension if not exists "pgcrypto";

create type public.member_role as enum ('admin', 'renter');
create type public.bill_type as enum ('electricity', 'wifi', 'water', 'rent');
create type public.payment_status as enum ('submitted', 'approved', 'rejected');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default 'UDH-304',
  name text not null default 'UDH-304',
  max_admins smallint not null default 3 check (max_admins between 1 and 3),
  max_renters smallint not null default 8 check (max_renters between 1 and 8),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null unique,
  role public.member_role not null default 'renter',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.billing_periods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  label text not null,
  starts_on date not null,
  ends_on date not null,
  due_on date not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (due_on >= starts_on)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  billing_period_id uuid not null references public.billing_periods(id) on delete cascade,
  type public.bill_type not null,
  title text not null check (char_length(trim(title)) between 2 and 160),
  amount numeric(12,2) not null check (amount >= 0),
  started_on date not null,
  due_on date not null,
  notes text,
  source_image_path text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (billing_period_id, type),
  check (due_on >= started_on)
);

create table public.stay_dates (
  id uuid primary key default gen_random_uuid(),
  renter_id uuid not null references public.profiles(id) on delete cascade,
  billing_period_id uuid not null references public.billing_periods(id) on delete cascade,
  stay_date date not null,
  created_at timestamptz not null default now(),
  unique (renter_id, billing_period_id, stay_date)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  renter_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default current_date,
  status public.payment_status not null default 'submitted',
  receipt_path text,
  note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bill_id, renter_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.households (code, name) values ('UDH-304', 'UDH-304') on conflict (code) do nothing;

create or replace function public.enforce_household_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  household_limit smallint;
  member_count integer;
begin
  if new.role = 'admin' then
    select max_admins into household_limit from public.households where id = new.household_id;
  else
    select max_renters into household_limit from public.households where id = new.household_id;
  end if;
  select count(*) into member_count from public.profiles where household_id = new.household_id and role = new.role and active;
  if member_count >= household_limit then
    raise exception 'Household % has reached its % capacity', new.household_id, new.role;
  end if;
  return new;
end;
$$;

create trigger profiles_capacity_trigger
before insert or update of household_id, role, active on public.profiles
for each row execute function public.enforce_household_capacity();

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.billing_periods enable row level security;
alter table public.bills enable row level security;
alter table public.stay_dates enable row level security;
alter table public.payments enable row level security;
alter table public.audit_log enable row level security;

create or replace function public.current_profile()
returns public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid() and active = true limit 1;
$$;

create policy "members can view their household" on public.households for select using (id = (select household_id from public.current_profile()));
create policy "members can view profiles" on public.profiles for select using (household_id = (select household_id from public.current_profile()));
create policy "admins manage profiles" on public.profiles for all using (household_id = (select household_id from public.current_profile()) and (select role from public.current_profile()) = 'admin');
create policy "members view billing periods" on public.billing_periods for select using (household_id = (select household_id from public.current_profile()));
create policy "admins manage billing periods" on public.billing_periods for all using (household_id = (select household_id from public.current_profile()) and (select role from public.current_profile()) = 'admin');
create policy "members view bills" on public.bills for select using (household_id = (select household_id from public.current_profile()));
create policy "admins manage bills" on public.bills for all using (household_id = (select household_id from public.current_profile()) and (select role from public.current_profile()) = 'admin');
create policy "renters manage their stay dates" on public.stay_dates for all using (renter_id = auth.uid()) with check (renter_id = auth.uid());
create policy "admins view stay dates" on public.stay_dates for select using ((select role from public.current_profile()) = 'admin' and billing_period_id in (select id from public.billing_periods where household_id = (select household_id from public.current_profile())));
create policy "renters view own payments" on public.payments for select using (renter_id = auth.uid());
create policy "renters submit own payments" on public.payments for insert with check (renter_id = auth.uid());
create policy "admins manage payments" on public.payments for all using ((select role from public.current_profile()) = 'admin');
create policy "members view audit log" on public.audit_log for select using (household_id = (select household_id from public.current_profile()) and (select role from public.current_profile()) = 'admin');

insert into storage.buckets (id, name, public) values ('payment-receipts', 'payment-receipts', false) on conflict (id) do nothing;
create policy "members upload payment receipts" on storage.objects for insert to authenticated with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admins view payment receipts" on storage.objects for select to authenticated using (bucket_id = 'payment-receipts' and (select role from public.current_profile()) = 'admin');
create policy "renters view own receipts" on storage.objects for select to authenticated using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
