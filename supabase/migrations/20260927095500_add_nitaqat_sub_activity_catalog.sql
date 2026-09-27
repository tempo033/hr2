create table if not exists public.nitaqat_activity_catalog (
  id uuid primary key default gen_random_uuid(),
  main_activity text not null,
  sub_activity text not null,
  activity_code text,
  nitaqat_group text not null,
  source_title text not null default 'التصنيف الوطني للأنشطة الاقتصادية / بيانات الأنشطة الحكومية',
  source_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(main_activity,sub_activity)
);
alter table public.nitaqat_activity_catalog enable row level security;
drop policy if exists nitaqat_activity_catalog_select on public.nitaqat_activity_catalog;
create policy nitaqat_activity_catalog_select on public.nitaqat_activity_catalog for select to authenticated using (
  exists(select 1 from public.app_users u where u.user_id=auth.uid() and u.is_active=true and u.role in ('admin','hr','manager'))
);
-- The catalog is seeded from the Saudi national economic-activity references used by government activity classifications.
-- Nitaqat rules remain mapped to the parent Nitaqat group; the selected sub-activity is what the calculator displays and resolves.
insert into public.nitaqat_activity_catalog(main_activity,sub_activity,activity_code,nitaqat_group,source_url) values
('التشييد والبناء','الإنشاءات العامة للمباني السكنية','410010','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','الإنشاءات العامة للمباني غير السكنية (المدارس والمستشفيات والفنادق وغيرها)','410021','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء المطارات ومرافقها','410022','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','الإنشاءات العامة للمباني الحكومية','410023','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء الطرق والشوارع والأرصفة ومستلزمات الطرق','421010','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء الجسور والأنفاق','421020','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء خطوط السكك الحديدية','421030','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','تمديد أنابيب النفط والغاز','422020','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','تمديدات خطوط المياه بين المدن وإنشاء شبكات جديدة وداخل المدن','422031','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء المحطات والخطوط الرئيسية لتوزيع المياه','422032','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء محطات ومشاريع الصرف الصحي وشبكات المجاري والمضخات','422050','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء وإقامة محطات الطاقة الكهربائية والمحولات','422060','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء محطات وأبراج الاتصالات السلكية واللاسلكية والرادار','422070','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء محطات التكرير والبتروكيماويات والمصافي','429010','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء أرصفة الموانئ والمرافق البحرية','429020','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء الموانئ والمراسي السياحية (المارينا)','429030','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','إنشاء السدود','429040','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','الإنشاءات العامة الرياضية وتشمل الملاعب','429071','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','تمديدات الكهرباء والاتصالات وأنواع الأنابيب','422010','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','تركيبات كهربائية أخرى','432190','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','تمديد الأسلاك الكهربائية والاتصالات','432119','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','مقاولات عامة للمباني: الإنشاء والإصلاح والهدم والترميم','410040','التشييد والبناء والمقاولات','https://www.balady.gov.sa/'),
('التشييد والبناء','مقاولات فرعية تخصصية (أنشطة التشييد المتخصصة) — إنشاءات عامة',null,'التشييد والبناء والمقاولات','https://tenders.etimad.sa/')
on conflict(main_activity,sub_activity) do update set activity_code=excluded.activity_code,nitaqat_group=excluded.nitaqat_group,source_url=excluded.source_url,active=true,updated_at=now();

insert into public.nitaqat_rules(activity_group,sub_activity,m_value,m_values,targets,effective_from,effective_to,source_title,source_url,decision_no,active)
select c.nitaqat_group,c.sub_activity,r.m_value,r.m_values,r.targets,r.effective_from,r.effective_to,r.source_title,r.source_url,r.decision_no,true
from public.nitaqat_activity_catalog c
join lateral (
  select * from public.nitaqat_rules rr
  where rr.activity_group=c.nitaqat_group and rr.sub_activity is null and rr.active=true
  order by rr.effective_from desc limit 1
) r on true
on conflict(activity_group,sub_activity,effective_from) do update set
  m_value=excluded.m_value,m_values=excluded.m_values,targets=excluded.targets,
  source_title=excluded.source_title,source_url=excluded.source_url,decision_no=excluded.decision_no,
  active=true,updated_at=now();