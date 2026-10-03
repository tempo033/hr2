-- HR2 Multi-Tenant Foundation
-- Phase 1: additive-only schema. This migration intentionally does NOT modify
-- any existing HR2 tables or data.

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  slug text not null unique,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  name_en text,
  code text,
  unified_number text,
  commercial_registration text,
  branch_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name),
  unique (tenant_id, code)
);

create index if not exists idx_branches_tenant_id
  on public.branches(tenant_id);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  name_en text,
  description text,
  price numeric(12,2),
  billing_period text,
  max_employees integer,
  max_branches integer,
  max_users integer,
  storage_limit_mb bigint,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  plan_id uuid references public.plans(id) on delete restrict,
  status text not null default 'trial',
  starts_at timestamptz,
  ends_at timestamptz,
  max_employees_override integer,
  max_branches_override integer,
  max_users_override integer,
  storage_limit_mb_override bigint,
  feature_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_tenant_id
  on public.subscriptions(tenant_id);

create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'company_admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index if not exists idx_tenant_users_user_id
  on public.tenant_users(user_id);

create table if not exists public.tenant_user_branches (
  tenant_user_id uuid not null references public.tenant_users(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tenant_user_id, branch_id)
);

create index if not exists idx_tenant_user_branches_branch_id
  on public.tenant_user_branches(branch_id);

-- These tables are foundation-only for now. No existing HR2 data is touched.
-- RLS is enabled from creation so the new tables cannot accidentally become
-- publicly readable before their tenant-aware policies are implemented.
alter table public.tenants enable row level security;
alter table public.branches enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tenant_users enable row level security;
alter table public.tenant_user_branches enable row level security;
