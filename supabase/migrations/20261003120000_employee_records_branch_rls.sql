create schema if not exists private;

create or replace function private.can_access_employee_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.branches b
    join public.tenant_users tu on tu.tenant_id = b.tenant_id
    where b.id = p_branch_id
      and tu.user_id = (select auth.uid())
      and tu.is_active = true
      and (
        tu.role = 'admin'
        or exists (
          select 1
          from public.tenant_user_branches tub
          where tub.tenant_user_id = tu.id
            and tub.branch_id = b.id
        )
      )
  );
$$;

revoke execute on function private.can_access_employee_branch(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_access_employee_branch(uuid) to authenticated;

alter table public.employee_records enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='employee_records'
  loop
    execute format('drop policy if exists %I on public.employee_records', p.policyname);
  end loop;
end $$;

create policy "employee_records_branch_select" on public.employee_records
for select to authenticated
using (private.can_access_employee_branch(branch_id));

create policy "employee_records_branch_insert" on public.employee_records
for insert to authenticated
with check (private.can_access_employee_branch(branch_id));

create policy "employee_records_branch_update" on public.employee_records
for update to authenticated
using (private.can_access_employee_branch(branch_id))
with check (private.can_access_employee_branch(branch_id));

create policy "employee_records_branch_delete" on public.employee_records
for delete to authenticated
using (private.can_access_employee_branch(branch_id));

create index if not exists idx_employee_records_branch_id
on public.employee_records(branch_id);