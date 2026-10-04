create table if not exists public.employee_contracts (
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.employee_records(id) on delete cascade,
 document_id uuid references public.employee_documents(id) on delete set null,
 file_name text not null,
 status text not null default 'uploaded' check (status in ('uploaded','analyzing','review','reviewed','approved','error')),
 extracted_data jsonb not null default '{}'::jsonb,
 reviewed_data jsonb not null default '{}'::jsonb,
 employee_match jsonb not null default '{}'::jsonb,
 error_message text,
 uploaded_by uuid references auth.users(id) on delete set null,
 uploaded_by_name text,
 analyzed_at timestamptz,
 reviewed_at timestamptz,
 approved_by uuid references auth.users(id) on delete set null,
 approved_by_name text,
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists employee_contracts_employee_id_idx on public.employee_contracts(employee_id);
create index if not exists employee_contracts_document_id_idx on public.employee_contracts(document_id);
create table if not exists public.employee_contract_audit_logs (
 id uuid primary key default gen_random_uuid(),
 contract_id uuid not null references public.employee_contracts(id) on delete cascade,
 employee_id uuid not null references public.employee_records(id) on delete cascade,
 action text not null,
 details jsonb not null default '{}'::jsonb,
 user_id uuid references auth.users(id) on delete set null,
 user_name text,
 created_at timestamptz not null default now()
);
create index if not exists employee_contract_audit_contract_id_idx on public.employee_contract_audit_logs(contract_id);
alter table public.employee_contracts enable row level security;
alter table public.employee_contract_audit_logs enable row level security;