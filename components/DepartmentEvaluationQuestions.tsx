export type EvaluationOption={v:number;t:string}
export type EvaluationQuestion={id:string;title:string;options:EvaluationOption[]}
const make=(labels:string[]):EvaluationOption[]=>labels.map((t,i)=>({v:i*25,t}))
const withNA=(labels:string[]):EvaluationOption[]=>[...make(labels),{v:-1,t:'لا ينطبق'}]
export const DEPARTMENT_QUESTIONS:Record<string,EvaluationQuestion[]>={
 hr:[
  {id:'residency',title:'حالة الإقامة الحالية',options:withNA(['غير متوفرة','منتهية/تحتاج إجراء','سارية مع ملاحظات','سارية','سارية وقابلة للنقل'])},
  {id:'transfer',title:'قابلية نقل الكفالة/الخدمات عند الحاجة',options:withNA(['غير متاح','غير واضح','يحتاج موافقة','متاح بشروط','متاح دون عائق'])},
  {id:'contract',title:'الوضع التعاقدي الحالي وفترة الإشعار',options:withNA(['غير واضح','إشعار طويل','إشعار متوسط','إشعار قصير','متاح للمباشرة سريعًا'])},
  {id:'expected_salary',title:'الراتب المتوقع ومدى توافقه مع النطاق المعتمد',options:withNA(['غير متوافق','فارق كبير','يحتاج تفاوض','قريب من النطاق','متوافق'])},
  {id:'availability',title:'الجاهزية للمباشرة',options:withNA(['غير متاح','بعد مدة طويلة','خلال شهر','خلال أسبوعين','فورًا/خلال أيام'])},
  {id:'location',title:'الاستعداد للعمل في مواقع ومشاريع الشركة',options:withNA(['غير مستعد','متردد','مستعد بشروط','مستعد','مرن ومستعد'])},
  {id:'documents',title:'اكتمال المستندات والمتطلبات النظامية',options:withNA(['غير مكتملة','نواقص كثيرة','نواقص محدودة','شبه مكتملة','مكتملة'])},
  {id:'communication',title:'الاحترافية والوضوح في التواصل',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'hr_fit',title:'الملاءمة العامة من منظور الموارد البشرية',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
 ],
 specialized:[
  {id:'technical_experience',title:'عمق الخبرة الفنية المرتبطة مباشرة بالوظيفة',options:withNA(['لا توجد','محدودة','مناسبة','قوية','متقدمة ومباشرة'])},
  {id:'drawings',title:'قراءة وفهم الرسومات والمخططات الفنية',options:withNA(['لا يجيد','أساسيات','مقبول','جيد','متقدم'])},
  {id:'quantity',title:'حصر الكميات وQuantity Take-off',options:withNA(['لا يجيد','أساسيات','مقبول','جيد','متقدم'])},
  {id:'boq',title:'إعداد ومراجعة BOQ والمستخلصات',options:withNA(['لا يجيد','أساسيات','مقبول','جيد','متقدم'])},
  {id:'software',title:'إتقان البرامج والأدوات المطلوبة للوظيفة',options:withNA(['لا يجيد','أساسيات','مقبول','جيد','متقدم'])},
  {id:'shop',title:'إعداد ومراجعة Shop Drawings وAs-Built',options:withNA(['لا يجيد','أساسيات','مقبول','جيد','متقدم'])},
  {id:'rfi_material',title:'التعامل مع RFIs وMaterial Submittals',options:withNA(['لا يجيد','أساسيات','مقبول','جيد','متقدم'])},
  {id:'problem_solving',title:'تحليل المشكلات الفنية واقتراح الحلول',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'coordination',title:'التنسيق مع الموقع والاستشاري والمقاولين',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'technical_fit',title:'الملاءمة الفنية النهائية للوظيفة',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
 ],
 executive:[
  {id:'leadership',title:'القيادة وإدارة فرق العمل',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'planning',title:'إدارة البرنامج الزمني ونسب الإنجاز',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'cost',title:'الالتزام بالموازنة وضبط التكاليف',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'contracts',title:'إدارة الموردين والمقاولين من الباطن والعقود',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'quality',title:'إدارة الجودة ومعالجة ملاحظات الاستشاري',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'safety',title:'إدارة السلامة والمخاطر',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'reporting',title:'إعداد التقارير ورفع المعلومات للإدارة',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'decisions',title:'جودة وسرعة اتخاذ القرار',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'client',title:'إدارة العلاقة مع العميل والاستشاري',options:withNA(['ضعيف','محدود','مقبول','جيد','ممتاز'])},
  {id:'executive_fit',title:'الملاءمة التنفيذية للوظيفة والمشروع',options:withNA(['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])}
 ]
}
