# HR2 Multi-Tenant Data Map

## Review baseline
- Production Supabase project: pdkdvaisggntdrvpxuur
- Repository: tempo033/hr2
- main baseline reviewed: 473cf2274b3eec0d2dc51f69e52bd06df327dcbe
- feat/multi-tenant-foundation is currently 2 commits ahead of main and 0 behind.
- No production schema/data changes were made during this mapping review.

## 1. Current company-to-employee bridge

The current employee master is `public.employee_records`. It already contains `company_id`, which references `public.employee_companies`. This is the safest bridge for the first migration.

Current company distribution:
| Existing company | Unified number | Current employees |
|---|---:|---:|
| شركة البنية الاساسية للمقاولات | 7030224054 | 42 |
| شركة البنية للتاجير والخدمات اللوجستية | 7041914610 | 10 |
| شركة البنية للتقنية المعلومات | 7041965620 | 5 |

Important: the total employee_records table is larger than these three mapped companies, so employees with NULL/other company references must be audited before any branch backfill. No employee row should be copied or deleted.

## 2. Target tenant/branch mapping

One current customer/tenant:
- Tenant: شركة البنية الأساسية

Three branches/legal entities:
- شركة البنية الاساسية للمقاولات — 7030224054
- شركة البنية للتاجير والخدمات اللوجستية — 7041914610
- شركة البنية للتقنية المعلومات — 7041965620

The existing employee_companies rows remain the compatibility master during migration. Later, each company row can be linked to the new branch row rather than replacing the existing relationship.

## 3. Core ownership chains

### Employee chain
employee_records
→ employee_documents
→ employee_signatures
→ employee_status_history
→ employee_evaluations
→ employee_advance_requests
→ employee_permission_requests

Primary scope source: employee_records.company_id → employee_companies → branches → tenants.

Recommended migration:
1. Add nullable branch_id to employee_records.
2. Backfill branch_id from company_id.
3. Validate every employee that should be tenant-scoped.
4. Keep company_id unchanged for compatibility.
5. Only later make branch_id required where business rules permit.

### Clearance / exit chain
employee_records
→ financial_clearances
→ financial_clearance_items
→ financial_clearance_approvals
→ financial_clearance_audit_logs
→ financial_clearance_links

employee_records
→ exit_service_records

Recommended scope: derive tenant/branch from the employee. Child financial-clearance tables should inherit access through clearance_id instead of duplicating tenant/branch columns unless a later performance requirement justifies it.

### Investigation chain
employee_records
→ administrative_investigations
→ administrative_investigation_parties
→ administrative_investigation_reviews

Recommended scope: employee branch/tenant inherited from employee_id.

### Recruitment chain
requests
→ request_requirements
→ candidates
→ candidate_requirement_scores
→ candidate_interviews
→ candidate_evaluation_links
→ candidate_hiring_approvals
→ employee_onboarding
→ employee_records

Current requests use company_name text, which is not sufficient as the future security boundary.

Recommended migration:
1. Add nullable branch_id to requests.
2. Map existing request company_name values to branches.
3. Keep company_name for compatibility/UI.
4. Scope all child recruitment records through request_id/candidate_id.
5. When onboarding creates an employee, ensure the resulting employee branch matches the recruitment branch.

### Payroll chain
payroll_runs
→ payroll_items
→ payroll_gosi
→ payroll_approvals
→ payroll_wps_exports

Employee-linked payroll:
payroll_attendance / payroll_bonuses / payroll_deductions / payroll_advances / payroll_overtime / payroll_settlements

Recommended scope:
- payroll_runs gets a proper branch_id.
- payroll child rows inherit scope from run_id where applicable.
- employee-linked payroll rows inherit scope from employee_id.
- payroll_overtime must also reconcile project scope.
- Existing payroll calculations and monthly fingerprint-sheet behavior must not be changed.

### Attendance chain
attendance_records
→ employee_id + location_id
attendance_employee_locations
→ employee_id + location_id
attendance_employee_users
→ employee_id + user_id
attendance_devices
→ employee_id

Recommended scope:
- employee-linked records inherit employee branch.
- locations/devices require explicit branch ownership because they may not always have employee_id.
- do not assume location text/name is a security boundary.

## 4. Payroll attendance import risk

These current tables have RLS disabled:
- payroll_attendance_sheets
- payroll_attendance_sheet_rows
- payroll_attendance_column_mappings

This was not changed during the mapping phase. They need a dedicated tenant-aware RLS migration after their parent/ownership chain is finalized. Enabling RLS prematurely could break the current attendance import workflow.

## 5. Current RLS/security observation

Several existing policies are broad/public (including examples where `qual = true`). This means the SaaS isolation layer cannot simply be added in the UI.

Migration order must be:
1. establish tenant/branch ownership;
2. add correct tenant/branch-aware policies;
3. test each role;
4. retire broad legacy policies only after the new policies are proven.

Do not perform a bulk replacement of existing RLS policies.

## 6. Tables that should receive direct branch scope first

Priority group A:
- employee_records
- requests
- financial_clearances
- exit_service_records
- administrative_investigations
- payroll_runs
- payroll_attendance_sheets
- attendance_locations
- attendance_devices

Priority group B:
- employee_documents
- employee_signatures
- employee_status_history
- employee_evaluations
- employee_advance_requests
- employee_permission_requests
- hr_form_records
- hr_form_links
- payroll attendance/transaction tables that lack a safe inherited path

Priority group C:
- recruitment detail tables, which should normally inherit scope from request/candidate
- financial clearance child tables, which should normally inherit scope from clearance
- payroll run child tables, which should normally inherit scope from payroll_runs

## 7. Master/configuration tables requiring a separate decision

These should not automatically become branch-specific:
- job_descriptions
- job_kpi_templates
- nitaqat_activity_catalog
- nitaqat_rules
- nitaqat_special_cases
- payroll_settings
- payroll_permissions
- payroll_projects
- attendance_locations

The final model should distinguish platform-wide reference data from tenant-specific configuration.

## 8. Migration order

### Step 1 — Foundation
Already prepared on the development branch:
- tenants
- branches
- plans
- subscriptions
- tenant_users
- tenant_user_branches

### Step 2 — Compatibility links
Add only nullable references first:
- employee_companies → branch
- employee_records → branch
- requests → branch

No deletion/renaming of current fields.

### Step 3 — Backfill
- Create one tenant for the current customer.
- Create three branch rows.
- Link the three existing company records.
- Backfill employee_records.branch_id from company_id.
- Backfill requests.branch_id from company_name where the mapping is unambiguous.
- Produce an exception report for NULL/unmatched ownership.

### Step 4 — Verify
Required checks:
- every scoped employee belongs to exactly one branch;
- every branch belongs to exactly one tenant;
- recruitment requests and their candidates stay in the same tenant/branch;
- clearance/exit/investigation records resolve to the employee's tenant/branch;
- payroll runs and attendance sheets resolve to the correct branch;
- no cross-tenant join is possible through child tables.

### Step 5 — RLS
Implement role-aware policies for:
- platform_owner
- company_admin
- branch_manager
- hr
- manager
- interview_viewer

Use database ownership checks, not UI-only filtering.

## 9. Critical exceptions to resolve before backfill

1. employee_records rows without one of the three mapped company IDs.
2. requests whose company_name is empty or does not exactly match a mapped branch.
3. payroll_runs that use the current text branch field instead of a branch FK.
4. attendance_locations without explicit branch ownership.
5. app_users that currently use legacy roles and are not yet represented in tenant_users/tenant_user_branches.
6. Any child record whose parent relationship is missing or inconsistent.

## 10. Safety rules

- Do not copy employee data into a new employees table.
- Do not delete employee_companies.
- Do not delete company_id from employee_records.
- Do not change Iqama, payroll, attendance, recruitment, clearance or investigation business rules as part of this migration.
- Do not enable tenant RLS on existing tables until ownership/backfill is verified.
- Do not apply the production migration until the development branch has been tested.
