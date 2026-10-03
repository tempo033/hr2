-- HR2 multi-tenant compatibility mapping
-- Additive only. Preserves existing company_id/company_name fields and employee rows.
-- Depends on 20261003090000_multi_tenant_foundation.sql

insert into public.tenants (name, name_en, slug)
values ('شركة البنية الأساسية', 'Al Bunya Al Asasiya', 'al-bunya-al-asasiya')
on conflict (slug) do update
set name = excluded.name,
    name_en = excluded.name_en,
    updated_at = now();

insert into public.branches (
  tenant_id, name, unified_number, branch_type
)
select
  t.id,
  v.name,
  v.unified_number,
  'legal_entity'
from public.tenants t
cross join (
  values
    ('شركة البنية الاساسية للمقاولات', '7030224054'),
    ('شركة البنية للتاجير والخدمات اللوجستية', '7041914610'),
    ('شركة البنية للتقنية المعلومات', '7041965620')
) as v(name, unified_number)
where t.slug = 'al-bunya-al-asasiya'
on conflict (tenant_id, name) do update
set unified_number = excluded.unified_number,
    branch_type = excluded.branch_type,
    updated_at = now();

alter table public.employee_companies
  add column if not exists branch_id uuid;

alter table public.employee_records
  add column if not exists branch_id uuid;

alter table public.requests
  add column if not exists branch_id uuid;

create index if not exists idx_employee_companies_branch_id
  on public.employee_companies(branch_id);

create index if not exists idx_employee_records_branch_id
  on public.employee_records(branch_id);

create index if not exists idx_requests_branch_id
  on public.requests(branch_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'employee_companies_branch_id_fkey'
  ) then
    alter table public.employee_companies
      add constraint employee_companies_branch_id_fkey
      foreign key (branch_id) references public.branches(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'employee_records_branch_id_fkey'
  ) then
    alter table public.employee_records
      add constraint employee_records_branch_id_fkey
      foreign key (branch_id) references public.branches(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'requests_branch_id_fkey'
  ) then
    alter table public.requests
      add constraint requests_branch_id_fkey
      foreign key (branch_id) references public.branches(id) on delete restrict;
  end if;
end $$;

-- Link the existing company master rows to their corresponding branches.
update public.employee_companies ec
set branch_id = b.id
from public.branches b
join public.tenants t on t.id = b.tenant_id
where t.slug = 'al-bunya-al-asasiya'
  and b.unified_number = ec.unified_number
  and ec.unified_number in ('7030224054', '7041914610', '7041965620');

-- Backfill only employees whose current company mapping is unambiguous.
-- Employees with NULL/other company_id remain untouched for later review.
update public.employee_records er
set branch_id = ec.branch_id
from public.employee_companies ec
where er.company_id = ec.id
  and ec.branch_id is not null
  and er.branch_id is null;

-- Current recruitment requests all use the legacy display value
-- "البنية الاساسية للمقاولات"; preserve company_name and map it to the
-- official legal-entity branch without changing the existing text.
update public.requests r
set branch_id = b.id
from public.branches b
join public.tenants t on t.id = b.tenant_id
where t.slug = 'al-bunya-al-asasiya'
  and b.unified_number = '7030224054'
  and b.name = 'شركة البنية الاساسية للمقاولات'
  and btrim(r.company_name) in (
    'البنية الاساسية للمقاولات',
    'شركة البنية الاساسية للمقاولات'
  )
  and r.branch_id is null;

-- Intentionally do not make branch_id NOT NULL yet.
-- 220 current employee_records rows are not safely attributable to one
-- of the three mapped legal entities and must be reviewed before backfill.
