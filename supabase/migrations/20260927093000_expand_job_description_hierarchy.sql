-- Job library hierarchy and full construction workforce roles
alter table public.job_descriptions
  add column if not exists job_level integer not null default 4,
  add column if not exists job_family text,
  add column if not exists sort_order integer not null default 400,
  add column if not exists direct_reports jsonb not null default '[]'::jsonb;

create index if not exists job_descriptions_hierarchy_idx
  on public.job_descriptions (job_level, sort_order, department, name);

-- Existing records receive a deterministic hierarchy; detailed role data is stored in the table.
update public.job_descriptions
set job_level = case
  when name in ('الرئيس التنفيذي','المدير العام') then 8
  when name like 'نائب المدير العام%' or name like 'مدير %' then 7
  when name like 'نائب %' then 6
  when name like 'مهندس %' or name like 'محاسب %' or name like 'أخصائي %' or name like 'مسؤول %' or name = 'مراقب مالي' then 5
  when name like 'مشرف %' or name like 'مفتش %' or name like 'مراقب %' or name like 'منسق %' then 3
  else 4 end,
  job_family = coalesce(nullif(job_family,''), department)
where true;

-- The production database is seeded with the expanded workforce library by the HR system deployment.
