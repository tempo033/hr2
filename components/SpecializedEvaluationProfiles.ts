import type {EvaluationQuestion} from './DepartmentEvaluationQuestions'

const levels=['ضعيف','محدود','مقبول','جيد','ممتاز']
const first=(id:string,title:string):EvaluationQuestion=>({id,title,options:[{v:0,t:'لا توجد'},{v:25,t:'محدودة'},{v:50,t:'مناسبة'},{v:75,t:'قوية'},{v:100,t:'متقدمة'},{v:-1,t:'لا ينطبق'}]})
const common=(id:string,title:string):EvaluationQuestion=>({id,title,options:[...levels.map((t,i)=>({v:i*25,t})),{v:-1,t:'لا ينطبق'}]})
const final=(id:string,title:string):EvaluationQuestion=>({id,title,options:[...['غير مناسب','ضعيف','مقبول','جيد','ممتاز'].map((t,i)=>({v:i*25,t})),{v:-1,t:'لا ينطبق'}]})

const engineering=[
 first('technical_experience','الخبرة الهندسية المرتبطة مباشرة بالوظيفة'),
 common('drawings','قراءة وفهم المخططات والرسومات الهندسية'),
 common('quantity','حصر الكميات وQuantity Take-off'),
 common('boq','إعداد ومراجعة BOQ والمستخلصات'),
 common('software','إتقان البرامج الهندسية المطلوبة'),
 common('shop','إعداد ومراجعة Shop Drawings وAs-Built'),
 common('rfi_material','التعامل مع RFIs وMaterial Submittals'),
 common('problem_solving','تحليل المشكلات الفنية واقتراح الحلول'),
 common('coordination','التنسيق مع الموقع والاستشاري والمقاولين'),
 final('technical_fit','الملاءمة النهائية للوظيفة الهندسية')
]
const project=[
 first('project_experience','خبرة إدارة المشاريع والمشاريع المماثلة'),
 common('planning','إدارة البرنامج الزمني ونسب الإنجاز'),
 common('cost','إدارة التكاليف والموازنة والمستخلصات'),
 common('contracts','إدارة العقود والموردين والمقاولين من الباطن'),
 common('teams','إدارة فرق العمل والتنسيق بين الإدارات'),
 common('quality','إدارة الجودة وملاحظات الاستشاري'),
 common('safety','إدارة السلامة والمخاطر بالمشروع'),
 common('client','إدارة العلاقة مع المالك والاستشاري'),
 common('reporting','التقارير الدورية ورفع المعلومات للإدارة'),
 final('project_fit','الملاءمة النهائية لإدارة المشروع')
]
const accounting=[
 first('accounting_experience','الخبرة المحاسبية المرتبطة بالوظيفة'),
 common('site_accounting','المحاسبة ومستندات المشاريع والمواقع'),
 common('financial_reporting','إعداد التقارير والتسويات المالية'),
 common('cost_control','متابعة التكاليف ومراكز التكلفة'),
 common('invoices','مراجعة الفواتير والمستخلصات'),
 common('systems','إتقان أنظمة المحاسبة وExcel'),
 common('compliance','الالتزام بالضوابط والسياسات المحاسبية'),
 common('analysis','التحليل المالي واكتشاف الأخطاء'),
 common('accuracy','الدقة وسلامة المستندات'),
 final('accounting_fit','الملاءمة النهائية للإدارة المالية')
]
const procurement=[
 first('procurement_experience','الخبرة في المشتريات والتوريد'),
 common('supplier','إدارة الموردين ومقارنة العروض'),
 common('pricing','تحليل الأسعار والتفاوض'),
 common('materials','معرفة المواد والمواصفات واحتياجات المشاريع'),
 common('orders','إدارة طلبات وأوامر الشراء'),
 common('contracts','فهم الشروط والعقود التجارية'),
 common('erp','استخدام ERP وExcel'),
 common('delivery','متابعة التوريد ومواعيد التسليم'),
 common('coordination','التنسيق مع المشاريع والموردين'),
 final('procurement_fit','الملاءمة النهائية لإدارة المشتريات')
]
const sales=[
 first('sales_experience','الخبرة في المبيعات وتطوير الأعمال'),
 common('leads','توليد العملاء والفرص البيعية'),
 common('negotiation','التفاوض وإغلاق الصفقات'),
 common('market','معرفة السوق والعملاء'),
 common('proposals','إعداد العروض والتسعير'),
 common('relationships','إدارة علاقات العملاء'),
 common('communication','العرض والتواصل والإقناع'),
 common('crm','استخدام CRM وتقارير المبيعات'),
 common('targets','العمل وفق المستهدفات ومؤشرات الأداء'),
 final('sales_fit','الملاءمة النهائية لإدارة المبيعات وتطوير الأعمال')
]
const hse=[
 first('hse_experience','الخبرة في الأمن والسلامة والصحة المهنية'),
 common('risk','تقييم المخاطر وإجراءات السيطرة'),
 common('inspections','التفتيش وتوثيق الملاحظات'),
 common('incidents','التعامل مع الحوادث والتحقيقات'),
 common('training','التوعية والتدريب على السلامة'),
 common('regulations','معرفة متطلبات ولوائح السلامة'),
 common('site','متطلبات السلامة في مواقع الإنشاء'),
 common('reporting','تقارير السلامة والإجراءات التصحيحية'),
 common('communication','التواصل والتأثير والالتزام بالسلامة'),
 final('hse_fit','الملاءمة النهائية لإدارة الأمن والسلامة')
]
const general=[
 first('experience','الخبرة المرتبطة مباشرة بالوظيفة'),
 common('job_knowledge','المعرفة العملية بمهام الوظيفة'),
 common('tools','إتقان الأدوات والبرامج المطلوبة'),
 common('problem_solving','حل المشكلات واتخاذ القرار'),
 common('accuracy','الدقة وجودة تنفيذ الأعمال'),
 common('planning','التنظيم وإدارة الأولويات'),
 common('coordination','التنسيق مع الإدارات ذات العلاقة'),
 common('communication','التواصل والاحترافية'),
 common('adaptability','المرونة وسرعة التعلم'),
 final('job_fit','الملاءمة النهائية للوظيفة')
]

const normalize=(v:string)=>v.toLowerCase().replace(/[إأآ]/g,'ا').replace(/ة/g,'ه')
export function getSpecializedProfile(exactType:string|null|undefined){
 const t=normalize(exactType||'')
 if(/مدير\s*مشروع|مدراء\s*المشاريع|project\s*manager/.test(t))return {department:'إدارة المشاريع',questions:project}
 if(/محاسب|حسابات|ماليه|مالية|accountant|accounting|finance/.test(t))return {department:'الإدارة المالية',questions:accounting}
 if(/مشتريات|توريد|procurement|purchasing|buyer/.test(t))return {department:'إدارة المشتريات والتوريد',questions:procurement}
 if(/مبيعات|تسويق|تطوير\s*اعمال|تطوير\s*أعمال|sales|marketing|business\s*development/.test(t))return {department:'إدارة المبيعات وتطوير الأعمال',questions:sales}
 if(/امن\s*وسلامه|أمن\s*وسلامة|سلامه|سلامة|hse|safety/.test(t))return {department:'إدارة الأمن والسلامة',questions:hse}
 if(/مهندس|هندسي|معماري|مدني|كهرباء|كهربائي|ميكانيك|ميكانيكي|مكتب\s*فني|مشرف\s*موقع|مهندس\s*موقع|engineering|engineer|technical\s*office|architect|civil|electrical|mechanical|site\s*engineer/)return {department:'الإدارة الهندسية',questions:engineering}
 if(/موارد\s*بشريه|موارد\s*بشرية|hr|human\s*resources/.test(t))return {department:'إدارة الموارد البشرية',questions:general}
 if(/مستودع|مخازن|مخزن|لوجست|حركه|حركة|سائق|warehouse|logistics|fleet|transport/.test(t))return {department:'إدارة المستودعات والحركة',questions:general}
 if(/مبرمج|برمجه|برمجة|تقنيه|تقنية|معلومات|it|developer|programmer|web/.test(t))return {department:'إدارة تقنية المعلومات',questions:general}
 if(/مصمم|جرافيك|تصميم|graphic|designer|design/.test(t))return {department:'إدارة التصميم',questions:general}
 if(/عقود|contract/.test(t))return {department:'إدارة العقود',questions:general}
 if(/جوده|جودة|quality/.test(t))return {department:'إدارة الجودة',questions:general}
 return {department:'الإدارة المختصة بالوظيفة',questions:general}
}
