create or replace function public.set_employee_status(
  p_employee_id uuid,
  p_new_status text,
  p_reason text,
  p_source text,
  p_source_reference_id uuid default null,
  p_changed_by uuid default null,
  p_changed_by_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_status text;
  v_changed_by uuid;
  v_changed_by_name text;
  v_role text := current_setting('request.jwt.claim.role', true);
  v_row public.employee_records%rowtype;
begin
  if p_new_status not in ('فعال','إجازة','غير فعال','تم إنهاء خدماته') then
    raise exception 'حالة الموظف غير صالحة';
  end if;
  if p_source not in ('يدوي','تلقائي') then
    raise exception 'مصدر تغيير الحالة غير صالح';
  end if;
  if p_source = 'يدوي' then
    if v_role <> 'service_role'
       and not exists (
         select 1 from public.app_users u
         where u.user_id = coalesce(p_changed_by, (select auth.uid()))
           and u.is_active = true and u.role in ('admin','hr')
       ) then
      raise exception 'ليس لديك صلاحية تعديل حالة الموظف';
    end if;
  elsif v_role <> 'service_role' and (select auth.uid()) is null then
    raise exception 'التحديث التلقائي غير مصرح به';
  end if;

  select employee_status into v_old_status
  from public.employee_records where id=p_employee_id for update;
  if not found then raise exception 'الموظف غير موجود'; end if;

  if v_old_status = p_new_status then
    select * into v_row from public.employee_records where id=p_employee_id;
    return jsonb_build_object('changed',false,'employee',to_jsonb(v_row));
  end if;

  update public.employee_records
  set employee_status=p_new_status, updated_at=now()
  where id=p_employee_id
  returning * into v_row;

  v_changed_by := coalesce(p_changed_by,(select auth.uid()));
  v_changed_by_name := nullif(btrim(coalesce(p_changed_by_name,'')),'');
  if v_changed_by_name is null and v_changed_by is not null then
    select coalesce(u.display_name,au.email) into v_changed_by_name
    from auth.users au left join public.app_users u on u.user_id=au.id
    where au.id=v_changed_by;
  end if;

  insert into public.employee_status_history(
    employee_id,previous_status,new_status,reason,source,
    source_reference_id,changed_by,changed_by_name
  ) values (
    p_employee_id,v_old_status,p_new_status,p_reason,p_source,
    p_source_reference_id,v_changed_by,
    coalesce(v_changed_by_name,case when p_source='تلقائي' then 'النظام' else 'المستخدم' end)
  );

  return jsonb_build_object('changed',true,'employee',to_jsonb(v_row));
end;
$$;

revoke execute on function public.set_employee_status(uuid,text,text,text,uuid,uuid,text) from public;
revoke execute on function public.set_employee_status(uuid,text,text,text,uuid,uuid,text) from anon;
grant execute on function public.set_employee_status(uuid,text,text,text,uuid,uuid,text) to authenticated;
grant execute on function public.set_employee_status(uuid,text,text,text,uuid,uuid,text) to service_role;