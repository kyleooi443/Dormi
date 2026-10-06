-- 20261007_stay_day_shares.sql
-- Day-stay based splitting. Returns the total stay-days across active renters
-- for a billing period so the app can prorate shared bills (electricity, wifi,
-- water) per renter — without exposing anyone's individual stay dates.
-- Admins are excluded by design: stay days are a renter concept.

create or replace function public.stay_day_total(p_billing_period_id uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer
  from public.stay_dates sd
  join public.profiles p on p.id = sd.renter_id
  where sd.billing_period_id = p_billing_period_id
    and p.role = 'renter'
    and p.active
    and p.household_id = (select household_id from public.current_profile());
$$;

revoke all on function public.stay_day_total(uuid) from public;
grant execute on function public.stay_day_total(uuid) to authenticated;
