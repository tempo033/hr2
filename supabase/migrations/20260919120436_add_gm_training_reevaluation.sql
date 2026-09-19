alter table public.candidate_hiring_approvals add column if not exists gm_training_period text null;
alter table public.candidate_hiring_approvals add column if not exists gm_reevaluation_date date null;
