-- Fix HR2 app_users RLS recursion and restore authenticated job-description access.
create schema if not exists private;

create or replace function private.is_active_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.app_users
    where user_id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

revoke all on function private.is_active_app_admin() from public;
grant execute on function private.is_active_app_admin() to authenticated;

drop policy if exists "admins can manage app users" on public.app_users;
create policy "admins can manage app users"
on public.app_users
for all
to authenticated
using (private.is_active_app_admin())
with check (private.is_active_app_admin());

drop policy if exists "authenticated read job descriptions" on public.job_descriptions;
create policy "authenticated read job descriptions"
on public.job_descriptions
for select
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.user_id = auth.uid()
      and u.is_active = true
      and u.role in ('admin','hr','manager','interviewer')
  )
);

drop policy if exists "authenticated insert job descriptions" on public.job_descriptions;
create policy "authenticated insert job descriptions"
on public.job_descriptions
for insert
to authenticated
with check (
  exists (
    select 1 from public.app_users u
    where u.user_id = auth.uid()
      and u.is_active = true
      and u.role in ('admin','hr')
  )
);

drop policy if exists "authenticated update job descriptions" on public.job_descriptions;
create policy "authenticated update job descriptions"
on public.job_descriptions
for update
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.user_id = auth.uid()
      and u.is_active = true
      and u.role in ('admin','hr')
  )
)
with check (
  exists (
    select 1 from public.app_users u
    where u.user_id = auth.uid()
      and u.is_active = true
      and u.role in ('admin','hr')
  )
);

drop policy if exists "authenticated delete job descriptions" on public.job_descriptions;
create policy "authenticated delete job descriptions"
on public.job_descriptions
for delete
to authenticated
using (
  exists (
    select 1 from public.app_users u
    where u.user_id = auth.uid()
      and u.is_active = true
      and u.role in ('admin','hr')
  )
);
