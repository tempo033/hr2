-- Idempotent compatibility migration.
-- Existing HR2 users are mapped to the existing tenant only.
-- Branch access is intentionally NOT assigned here.

insert into public.tenant_users (tenant_id, user_id, role, is_active)
select
  t.id,
  au.user_id,
  au.role,
  au.is_active
from public.app_users au
cross join public.tenants t
where t.slug = 'al-bunya-al-asasiya'
on conflict (tenant_id, user_id) do update
set role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();

-- No rows are inserted into tenant_user_branches.
-- Branch access must be explicitly assigned by an authorized administrator.
