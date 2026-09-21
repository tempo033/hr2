-- Keep General Manager rejection/training decisions compatible with NOT NULL offer_status.
create or replace function public.sync_gm_decision_to_candidate()
returns trigger
language plpgsql
as $function$
begin
  if new.gm_decision = 'قبول' then
    update public.candidates set status = 'معتمد للتعيين', updated_at = now() where id = new.candidate_id;
    new.approval_status := 'معتمد';
    new.final_approval_status := 'معتمد';
    new.offer_status := 'جاهز للإكمال';
  elsif new.gm_decision = 'رفض' then
    update public.candidates set status = 'مرفوض', updated_at = now() where id = new.candidate_id;
    new.approval_status := 'مرفوض';
    new.final_approval_status := 'مرفوض';
    new.offer_status := 'مرفوض';
  elsif new.gm_decision = 'اعتماد فترة تدريب وإعادة تقييم' then
    update public.candidates set status = 'معلق حتى إعادة التقييم', updated_at = now() where id = new.candidate_id;
    new.approval_status := 'تحت التدريب وإعادة التقييم';
    new.final_approval_status := 'إعادة تقييم بعد التدريب';
    new.offer_status := 'معلق حتى إعادة التقييم';
  end if;
  return new;
end;
$function$;
