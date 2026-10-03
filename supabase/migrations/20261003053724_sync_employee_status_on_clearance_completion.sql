create or replace function public.sync_employee_status_from_clearance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c jsonb;
  employee_data jsonb;
  stage_data jsonb;
  stage_key text;
  signature_value text;
  decision_value text;
  reason text;
  normalized_reason text;
  target_status text;
  old_status text;
  changed_by_id uuid;
  changed_by_name text;
  skipped boolean;
  applies boolean;
  complete boolean := true;
begin
  if new.form_type <> 'clearance' or new.employee_id is null then return new; end if;
  c := coalesce(new.form_data->'clearance','{}'::jsonb);
  employee_data := coalesce(c->'employee','{}'::jsonb);
  if nullif(btrim(coalesce(employee_data->>'employee_signature','')),'') is null then return new; end if;

  foreach stage_key in array array['managers','it','transport','warehouse','admin','finance','hr','project_manager','senior']
  loop
    skipped := coalesce((c->'skipped'->>stage_key)::boolean,false);
    applies := coalesce((c->'applicability'->>stage_key)::boolean,true);
    if skipped or not applies then continue; end if;
    stage_data := coalesce(c->stage_key,'{}'::jsonb);
    if stage_key='managers' then
      signature_value := coalesce(stage_data->>'line_manager_signature',stage_data->>'project_manager_signature','');
      decision_value := coalesce(stage_data->>'clearance_decision','');
    elsif stage_key='senior' then
      signature_value := coalesce(stage_data->>'senior_signature','');
      decision_value := coalesce(stage_data->>'senior_decision','');
    else
      signature_value := coalesce(stage_data->>(stage_key||'_signature'),'');
      decision_value := coalesce(stage_data->>(stage_key||'_decision'),'');
    end if;
    if nullif(btrim(signature_value),'') is null or decision_value <> 'clear' then
      complete := false; exit;
    end if;
  end loop;

  if not complete then return new; end if;

  reason := btrim(coalesce(employee_data->>'reason',''));
  normalized_reason := lower(reason);
  normalized_reason := translate(normalized_reason,'إأآىةـ','ااايي');
  normalized_reason := regexp_replace(normalized_reason,'\s+',' ','g');

  if normalized_reason like '%اجازة%' then
    target_status := 'إجازة';
  elsif normalized_reason like '%خروج نهائي%' then
    target_status := 'تم إنهاء خدماته';
  elsif normalized_reason like '%انهاء خدمات%' or normalized_reason like '%انهاء خدمه%' then
    target_status := 'تم إنهاء خدماته';
  else return new;
  end if;

  select employee_status into old_status from public.employee_records where id=new.employee_id for update;
  if old_status is null or old_status=target_status then return new; end if;

  update public.employee_records set employee_status=target_status,updated_at=now() where id=new.employee_id;

  changed_by_id := (select auth.uid());
  if changed_by_id is not null then
    select coalesce(u.display_name,au.email) into changed_by_name
    from auth.users au left join public.app_users u on u.user_id=au.id
    where au.id=changed_by_id;
  end if;

  insert into public.employee_status_history(
    employee_id,previous_status,new_status,reason,source,source_reference_id,changed_by,changed_by_name
  ) values (
    new.employee_id,old_status,target_status,'إخلاء طرف: '||reason,'تلقائي',new.id,changed_by_id,coalesce(nullif(btrim(changed_by_name),''),'النظام')
  );
  return new;
end;
$$;

drop trigger if exists trg_sync_employee_status_from_clearance on public.hr_form_records;
create trigger trg_sync_employee_status_from_clearance
after insert or update of form_data,status
on public.hr_form_records
for each row execute function public.sync_employee_status_from_clearance();

revoke execute on function public.sync_employee_status_from_clearance() from public;
revoke execute on function public.sync_employee_status_from_clearance() from anon;
revoke execute on function public.sync_employee_status_from_clearance() from authenticated;