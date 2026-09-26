export type NitaqatBand = 'منخفض الأخضر'|'متوسط الأخضر'|'مرتفع الأخضر'|'البلاتيني'|'الأحمر'|'غير متاح'
export type NitaqatRule = { id:string; activity_group:string; sub_activity:string|null; m_value:number; targets:Record<string,Record<string,number>>; effective_from:string; effective_to:string|null; source_title:string; source_url:string; decision_no:string|null; active:boolean }
export type NitaqatResult = {
  total:number; saudi:number; nonSaudi:number; localizationRate:number|null; band:NitaqatBand;
  thresholds:Record<string,number>|null; ruleId:string|null; source:string; warnings:string[]
}
export function calculateNitaqat(input:{total:number;saudi:number;nonSaudi?:number;year:number;rule?:NitaqatRule|null}):NitaqatResult {
  const total=Math.max(0,Number(input.total)||0), saudi=Math.max(0,Number(input.saudi)||0)
  const nonSaudi=Math.max(0,Number(input.nonSaudi??Math.max(0,total-saudi))||0)
  if(total===0) return {total,saudi,nonSaudi,localizationRate:null,band:'غير متاح',thresholds:null,ruleId:null,source:'بيانات HR2 + قواعد نطاقات المحفوظة بالنظام',warnings:['لا توجد عمالة كافية للحساب.']}
  if(total<=5) return {total,saudi,nonSaudi,localizationRate:(saudi/total)*100,band:'غير متاح',thresholds:null,ruleId:null,source:'حاسبة نطاقات وزارة الموارد البشرية',warnings:['المنشآت التي لديها 5 عمال فأقل تتطلب عاملًا سعوديًا واحدًا وفق الحاسبة الرسمية؛ لا يتم استنتاج نطاق لوني داخلي لهذه الفئة.']}
  if(!input.rule) return {total,saudi,nonSaudi,localizationRate:(saudi/total)*100,band:'غير متاح',thresholds:null,ruleId:null,source:'بيانات HR2',warnings:['لم يتم العثور على قاعدة نشطة للنشاط المحدد والسنة المحددة.']}
  const y=String(input.year), t=input.rule.targets||{}
  const thresholds={ 'منخفض الأخضر':Number(t['منخفض الأخضر']?.[y]), 'متوسط الأخضر':Number(t['متوسط الأخضر']?.[y]), 'مرتفع الأخضر':Number(t['مرتفع الأخضر']?.[y]), 'البلاتيني':Number(t['البلاتيني']?.[y]) }
  if(Object.values(thresholds).some(v=>!Number.isFinite(v))) return {total,saudi,nonSaudi,localizationRate:(saudi/total)*100,band:'غير متاح',thresholds:null,ruleId:input.rule.id,source:input.rule.source_title,warnings:['بيانات القاعدة للسنة المطلوبة غير مكتملة.']}
  const rate=(saudi/total)*100
  let band:NitaqatBand='الأحمر'
  if(rate>=thresholds['البلاتيني']) band='البلاتيني'
  else if(rate>=thresholds['مرتفع الأخضر']) band='مرتفع الأخضر'
  else if(rate>=thresholds['متوسط الأخضر']) band='متوسط الأخضر'
  else if(rate>=thresholds['منخفض الأخضر']) band='منخفض الأخضر'
  return {total,saudi,nonSaudi,localizationRate:rate,band,thresholds,ruleId:input.rule.id,source:input.rule.source_title,warnings:[]}
}
export function targetSaudiCount(total:number,targetRate:number){ if(total<=0||!Number.isFinite(targetRate)) return null; return Math.ceil(total*targetRate/100) }
