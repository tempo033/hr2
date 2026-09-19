export type EvaluationOption={v:number;t:string}
export type EvaluationQuestion={id:string;title:string;options:EvaluationOption[]}
const make=(labels:string[]):EvaluationOption[]=>labels.map((t,i)=>({v:i*25,t}))
const withNA=(labels:string[]):EvaluationOption[]=>[...make(labels),{v:-1,t:'لا ينطبق'}]
const common=(items:[string,string][]):EvaluationQuestion[]=>items.map(([id,title])=>({id,title,options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])}))
const first=(id:string,title:string)=>({id,title,options:withNA(['لا توجد','محدودة','مناسبة','قوية','متقدمة'])})

const engineering=[
 first('technical_experience','الخبرة الهندسية المرتبطة مباشرة بالوظيفة'),
 ...common([['drawings','قراءة وفهم المخططات والرسومات الهندسية'],['quantity','حصر الكميات وQuantity Take-off'],['boq','إعداد ومراجعة BOQ والمستخلصات'],['software','إتقان البرامج الهندسية المطلوبة'],['shop','Shop Drawings وAs-Built'],['rfi','التعامل مع RFIs وMaterial Submittals'],['problem_solving','تحليل المشكلات الفنية واقتراح الحلول'],['coordination','التنسيق مع الموقع والاستشاري والمقاولين']]),
 {id:'technical_fit',title:'الملاءمة النهائية للوظيفة الهندسية',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
]
const projectManagement=[
 first('project_experience','خبرة إدارة المشاريع والمشاريع المماثلة'),
 ...common([['planning','إدارة البرنامج الزمني ونسب الإنجاز'],['cost','إدارة التكاليف والموازنة'],['contracts','إدارة العقود والموردين والمقاولين من الباطن'],['teams','إدارة فرق العمل والتنسيق بين الإدارات'],['quality','إدارة الجودة وملاحظات الاستشاري'],['safety','إدارة السلامة والمخاطر بالمشروع'],['client','إدارة العلاقة مع المالك والاستشاري'],['reporting','التقارير الدورية ورفع المعلومات']]),
 {id:'project_fit',title:'الملاءمة النهائية لإدارة المشروع',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
]
const accounting=[
 first('accounting_experience','الخبرة المحاسبية المرتبطة بالوظيفة'),
 ...common([['site_accounting','المحاسبة ومستندات المشاريع والمواقع'],['financial_reporting','إعداد التقارير والتسويات المالية'],['cost_control','متابعة التكاليف ومراكز التكلفة'],['invoices','مراجعة الفواتير والمستخلصات'],['systems','إتقان أنظمة المحاسبة وExcel'],['compliance','الالتزام بالضوابط والسياسات المحاسبية'],['analysis','التحليل المالي واكتشاف الأخطاء'],['accuracy','الدقة وسلامة المستندات']]),
 {id:'accounting_fit',title:'الملاءمة النهائية للإدارة المالية',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
]
const procurement=[
 first('procurement_experience','الخبرة في المشتريات والتوريد'),
 ...common([['supplier','إدارة الموردين ومقارنة العروض'],['pricing','تحليل الأسعار والتفاوض'],['materials','معرفة المواد والمواصفات واحتياجات المشاريع'],['orders','إدارة طلبات وأوامر الشراء'],['contracts','فهم الشروط والعقود التجارية'],['erp','استخدام ERP وExcel'],['delivery','متابعة التوريد ومواعيد التسليم'],['coordination','التنسيق مع المشاريع والموردين']]),
 {id:'procurement_fit',title:'الملاءمة النهائية لإدارة المشتريات',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
]
const hr=[
 first('hr_experience','الخبرة في الموارد البشرية وأنظمة العمل'),
 ...common([['recruitment','إدارة الاستقطاب والمقابلات والتوظيف'],['employee_relations','علاقات الموظفين والملفات'],['labor_law','معرفة نظام العمل واللوائح'],['systems','إتقان أنظمة الموارد البشرية وExcel'],['payroll','الرواتب والحضور والإجازات'],['reporting','تقارير ومؤشرات الموارد البشرية'],['confidentiality','السرية في بيانات الموظفين'],['communication','التواصل وحل مشكلات الموظفين']]),
 {id:'hr_fit','title':'الملاءمة النهائية لإدارة الموارد البشرية',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
]
const sales=[
 first('sales_experience','الخبرة في المبيعات وتطوير الأعمال'),
 ...common([['leads','توليد العملاء والفرص البيعية'],['negotiation','التفاوض وإغلاق الصفقات'],['market','معرفة السوق والعملاء'],['proposals','إعداد العروض والتسعير'],['relationships','إدارة علاقات العملاء'],['communication','العرض والتواصل والإقناع'],['crm','استخدام CRM وتقارير المبيعات'],['targets','العمل وفق المستهدفات ومؤشرات الأداء']]),
 {id:'sales_fit',title:'الملاءمة النهائية لإدارة المبيعات وتطوير الأعمال',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
]
const hse=[
 first('hse_experience','الخبرة في الأمن والسلامة والصحة المهنية'),
 ...common([['risk','تقييم المخاطر وإجراءات السيطرة'],['inspections','التفتيش وتوثيق الملاحظات'],['incidents','التعامل مع الحوادث والتحقيقات'],['training','التوعية والتدريب على السلامة'],['regulations','معرفة متطلبات ولوائح السلامة'],['site','متطلبات السلامة في مواقع الإنشاء'],['reporting','تقارير السلامة والإجراءات التصحيحية'],['communication','التواصل والتأثير والالتزام بالسلامة']]),
 {id:'hse_fit',title:'الملاءمة النهائية لإدارة الأمن والسلامة',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
]
const general=common([['experience','الخبرة المرتبطة مباشرة بالوظيفة'],['job_knowledge','المعرفة العملية بمهام الوظيفة'],['tools','إتقان الأدوات والبرامج المطلوبة'],['problem_solving','حل المشكلات واتخاذ القرار'],['accuracy','الدقة وجودة تنفيذ الأعمال'],['planning','التنظيم وإدارة الأولويات'],['coordination','التنسيق مع الإدارات ذات العلاقة'],['communication','التواصل والاحترافية'],['adaptability','المرونة وسرعة التعلم']])

export const DEPARTMENT_QUESTIONS:Record<string,EvaluationQuestion[]>={
 hr:[
  {id:'residency',title:'حالة الإقامة الحالية',options:withNA(['غير متوفرة','منتهية/تحتاج إجراء','سارية مع ملاحظات','سارية','سارية وقابلة للنقل'])},
  {id:'transfer',title:'قابلية نقل الكفالة/الخدمات عند الحاجة',options:withNA(['غير متاح','غير واضح','يحتاج موافقة','متاح بشروط','متاح دون عائق'])},
  {id:'contract',title:'الوضع التعاقدي وفترة الإشعار',options:withNA(['غير واضح','إشعار طويل','إشعار متوسط','إشعار قصير','متاح للمباشرة سريعًا'])},
  {id:'expected_salary',title:'الراتب المتوقع وتوافقه مع النطاق',options:withNA(['غير متوافق','فارق كبير','يحتاج تفاوض','قريب من النطاق','متوافق'])},
  {id:'availability',title:'الجاهزية للمباشرة',options:withNA(['غير متاح','بعد مدة طويلة','خلال شهر','خلال أسبوعين','فورًا/خلال أيام'])},
  {id:'location',title:'الاستعداد للعمل في مواقع ومشاريع الشركة',options:withNA(['غير مستعد','متردد','مستعد بشروط','مستعد','مرن ومستعد'])},
  {id:'documents',title:'اكتمال المستندات والمتطلبات النظامية',options:withNA(['غير مكتملة','نواقص كثيرة','نواقص محدودة','شبه مكتملة','مكتملة'])},
  {id:'communication',title:'الاحترافية والوضوح في التواصل',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'hr_fit',title:'الملاءمة العامة من منظور الموارد البشرية',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
 ],
 specialized:general,
 executive:common([['leadership','القيادة وإدارة فرق العمل'],['planning','إدارة البرنامج الزمني ونسب الإنجاز'],['cost','الالتزام بالموازنة وضبط التكاليف'],['contracts','إدارة الموردين والمقاولين والعقود'],['quality','إدارة الجودة وملاحظات الاستشاري'],['safety','إدارة السلامة والمخاطر'],['reporting','إعداد التقارير ورفع المعلومات للإدارة'],['decisions','جودة وسرعة اتخاذ القرار'],['client','إدارة العلاقة مع العميل والاستشاري']]),
 general_manager:[]
}

const normalize=(v:string)=>v.toLowerCase().replace(/[إأآ]/g,'ا').replace(/ة/g,'ه')
export function getSpecializedProfile(exactType:string|null|undefined){
 const t=normalize(exactType||'')
 if(/مدير\s*مشروع|مدراء\s*المشاريع|project\s*manager/.test(t))return {department:'إدارة المشاريع',questions:projectManagement}
 if(/محاسب|حسابات|ماليه|accountant|accounting|finance/.test(t))return {department:'الإدارة المالية',questions:accounting}
 if(/مشتريات|توريد|procurement|purchasing|buyer/.test(t))return {department:'إدارة المشتريات والتوريد',questions:procurement}
 if(/موارد\s*بشريه|hr|human\s*resources/.test(t))return {department:'إدارة الموارد البشرية',questions:hr}
 if(/مبيعات|تسويق|تطوير\s*اعمال|sales|marketing|business\s*development/.test(t))return {department:'إدارة المبيعات وتطوير الأعمال',questions:sales}
 if(/امن\s*وسلامه|سلامه|hse|safety/.test(t))return {department:'إدارة الأمن والسلامة',questions:hse}
 if(/مستودع|مخازن|لوجست|حركه|سائق|warehouse|logistics|fleet|transport/.test(t))return {department:'إدارة المستودعات والحركة',questions:general}
 if(/مبرمج|برمجه|تقنيه|معلومات|it|developer|programmer|web/.test(t))return {department:'إدارة تقنية المعلومات',questions:general}
 if(/مصمم|جرافيك|تصميم|graphic|designer|design/.test(t))return {department:'إدارة التصميم',questions:general}
 if(/عقود|contract/.test(t))return {department:'إدارة العقود',questions:general}
 if(/جوده|quality/.test(t))return {department:'إدارة الجودة',questions:general}
 if(/مهندس|هندسي|معماري|مدني|كهرباء|كهربائي|ميكانيك|ميكانيكي|مكتب\s*فني|مشرف\s*موقع|engineering|engineer|technical\s*office|architect|civil|electrical|mechanical|site\s*engineer/)
  return {department:'الإدارة الهندسية',questions:engineering}
 return {department:'الإدارة المختصة بالوظيفة',questions:general}
}
