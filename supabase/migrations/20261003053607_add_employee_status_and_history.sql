alter table public.employee_records
  add column if not exists employee_status text not null default 'فعال';

update public.employee_records
set employee_status='فعال'
where employee_status is null or btrim(employee_status)='';

alter table public.employee_records
  drop constraint if exists employee_records_employee_status_check;

alter table public.employee_records
  add constraint employee_records_employee_status_check
  check (employee_status in ('فعال','إجازة','غير فعال','تم إنهاء خدماته'));

create table if not exists public.employee_status_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee_records(id) on delete cascade,
  previous_status text,
  new_status text not null check (new_status in ('فعال','إجازة','غير فعال','تم إنهاء خدماته')),
  reason text not null,
  source text not null check (source in ('يدوي','تلقائي')),
  source_reference_id uuid,
  changed_by uuid references auth.users(id) on delete set null,
  changed_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists employee_status_history_employee_id_created_at_idx
  on public.employee_status_history(employee_id, created_at desc);

alter table public.employee_status_history enable row level security;

drop policy if exists "employee_status_history_authenticated_read" on public.employee_status_history;
create policy "employee_status_history_authenticated_read"
  on public.employee_status_history for select to authenticated using (true);

drop policy if exists "employee_status_history_authenticated_insert" on public.employee_status_history;
create policy "employee_status_history_authenticated_insert"
  on public.employee_status_history for insert to authenticated with check (true);