# HR2 Multi-Tenant Architecture Map

## Purpose
This document defines the safe migration path from the current single-company HR2 model to a SaaS multi-tenant model without deleting or rebuilding existing HR data or current modules.

## Current baseline
- GitHub repository: tempo033/hr2
- Default branch: main
- Current main baseline reviewed: 473cf2274b3eec0d2dc51f69e52bd06df327dcbe
- Active development branch: feat/multi-tenant-foundation
- The multi-tenant branch is currently 1 commit ahead of main and 0 behind.
- Current employee data is in public.employee_records (277 rows at review time); public.employees currently has 0 rows.
- Existing company master is public.employee_companies.
- Existing employee_records.company_id already references employee_companies.

## Tenant model
A tenant is one customer account/subscription in HR2.

A tenant may have one or more branches/legal entities. Branch limits are controlled by the tenant subscription/plan and may be overridden by the platform owner.

Current customer mapping:
- Tenant: شركة البنية الأساسية
  - Branch: شركة البنية الاساسية للمقاولات — 7030224054
  - Branch: شركة البنية للتاجير والخدمات اللوجستية — 7041914610
  - Branch: شركة البنية للتقنية المعلومات — 7041965620

These existing company records must be preserved and mapped; they must not be duplicated or deleted.

## New foundation tables
Created additively in:
supabase/migrations/20261003090000_multi_tenant_foundation.sql

Tables:
- tenants
- branches
- plans
- subscriptions
- tenant_users
- tenant_user_branches

RLS is enabled on these new tables, but policies are intentionally not created yet. The migration has NOT been applied to production.

## Access model
Planned roles:
- platform_owner: controls customers, plans, subscriptions, limits and platform configuration.
- company_admin: full access inside one tenant, subject to enabled features.
- branch_manager: access only to assigned branches.
- hr: HR operations within assigned tenant/branches.
- manager: management access within assigned scope.
- interview_viewer: recruitment/interview read-only scope, preserving the existing role behavior.

Authorization must be enforced at database/RLS level, not only by hiding UI controls.

## Existing-table migration strategy

### Direct branch/tenant scope
Core tables that should eventually receive a direct branch_id (and tenant_id only where justified for performance/integrity):
- employee_records
- employee_documents
- employee_signatures
- employee_status_history
- employee_evaluations
- employee_advance_requests
- employee_permission_requests
- attendance_* tables tied to employees/locations/devices
- payroll_* transactional tables
- financial_clearances and child tables
- exit_service_records
- hr_form_records / hr_form_links
- administrative_investigations and child tables

### Inherited scope
Child/detail tables should normally inherit tenant/branch scope through their parent foreign key instead of storing duplicate scope columns:
- financial_clearance_items
- financial_clearance_approvals
- financial_clearance_audit_logs
- financial_clearance_links
- candidate attachments/scores/interviews/approvals when linked through a tenant-scoped request/candidate
- request requirements
- payroll item/approval/WPS child records linked to a tenant-scoped payroll run

### Master/configuration tables
These need an explicit decision whether they are platform-wide, tenant-specific, or branch-specific:
- job_descriptions
- job_kpi_templates
- nitaqat_activity_catalog
- nitaqat_rules
- nitaqat_special_cases
- payroll_settings
- payroll_permissions
- payroll_projects
- attendance_locations
- employee_companies

The existing Nitaqat rules/catalog and generic job libraries should not be duplicated unnecessarily; tenant-specific settings should be separated from platform reference data.

## Recruitment scope
Recruitment starts at requests and flows through:
requests -> request_requirements -> candidates -> interviews/evaluation links -> hiring approvals -> onboarding -> employee_records.

The tenant/branch scope should be established at requests (and/or candidate ownership) and inherited through the workflow. Existing company_name text fields should not be relied on as the security boundary.

## Employee scope
employee_records.company_id is the current bridge to the existing company master. During migration:
1. Create one tenant for the current customer.
2. Create three branches for the three existing company records.
3. Map each existing employee_records.company_id to its corresponding branch.
4. Do not copy employee rows.
5. Keep company_id for compatibility during the transition.
6. Add branch_id gradually and only enforce it after backfill and verification.

## Financial clearance / exit scope
Financial clearances and exit service records are employee-linked and therefore must inherit the employee's tenant/branch. Their approval, audit, link and item tables must never become cross-tenant accessible.

## Payroll and attendance
Payroll and attendance are especially sensitive because some current tables have no tenant/branch column and several are currently linked indirectly through employee_id or run_id.

The migration should:
- establish branch scope at the employee/run/sheet/location level,
- propagate scope to child rows through foreign keys,
- preserve current monthly attendance-sheet uploads,
- preserve payroll calculations and snapshots,
- avoid changing existing payroll business rules.

## RLS migration rule
Do not replace current RLS policies in bulk.

Process:
1. Add tenant/branch model.
2. Backfill and verify ownership.
3. Add helper authorization functions if needed.
4. Add tenant-aware policies table by table.
5. Test as platform owner, company admin, branch manager, HR and read-only users.
6. Only then remove/retire broad legacy policies.

## Important security finding
At review time, Supabase reports RLS disabled on:
- public.payroll_attendance_sheets
- public.payroll_attendance_sheet_rows
- public.payroll_attendance_column_mappings

This is a critical security issue. It was intentionally NOT auto-fixed because enabling RLS without correct policies would block the existing payroll/attendance functionality. It must be handled in a dedicated security-hardening step with tenant-aware policies.

## Development synchronization rule
Any new feature merged into main must remain part of the multi-tenant workstream.

Before each multi-tenant change:
1. Compare feat/multi-tenant-foundation with main.
2. If main has new commits, update/rebase the development branch safely.
3. Re-check changed HR modules and migrations.
4. Never overwrite newer main changes with an older multi-tenant branch.
5. Keep all schema changes as reviewed migration files in GitHub.

## Phase plan
### Phase 1 — Foundation (current)
- Add tenant/branch/plan/subscription/user-scope tables.
- No production data changes.
- No existing table changes.
- No RLS replacement.

### Phase 2 — Data mapping
- Map current three companies to one tenant + three branches.
- Add compatibility-safe branch references to core records.
- Backfill and verify.

### Phase 3 — Authorization
- Add tenant/branch-aware RLS.
- Scope app_users/tenant_users.
- Test isolation.

### Phase 4 — Application context
- Add tenant/branch selector where appropriate.
- Scope dashboards, employees, payroll, attendance, recruitment, clearance, investigations, documents and reports.
- Preserve existing UX and business rules.

### Phase 5 — SaaS administration
- Platform owner dashboard.
- Customers.
- Plans.
- Subscription status.
- Employee/user/branch limits.
- Feature entitlements.
- Tenant onboarding.

### Phase 6 — Public SaaS website
- HR2 marketing site.
- Product explanation/demo.
- Plans/pricing.
- Signup/onboarding flow.
- Customer login.

## Non-negotiable safety rules
- No deleting current HR tables.
- No deleting current employee data.
- No rebuilding the Iqama dashboard.
- No changing current HR business rules unless explicitly requested.
- No production migration until the migration has been reviewed/tested.
- No customer data can be exposed across tenants.
