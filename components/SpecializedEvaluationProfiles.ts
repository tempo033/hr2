type Option={v:number;t:string}
type Question={id:string;title:string;options:Option[]}
const optionSet=(labels:string[]):Option[]=>[...labels.map((t,i)=>({v:i*25,t})),{v:-1,t:'لا ينطبق'}]
const question=(id:string,title:string,labels=['ضعيف','محدود','مقبول','جيد','ممتاز']):Question=>({id,title,options:optionSet(labels)})
const first=(id:string,title:string):Question=>question(id,title,['لا توجد','محدودة','مناسبة','قوية','متقدمة'])
const final=(id:string,title:string):Question=>question(id,title,['غير مناسب','ضعيف','مقبول','جيد','ممتاز'])
const engineering:Question[]=[
 first('technical_experience','الخبرة الهندسية المرتبطة مباشرة بالوظيفة'),question('drawings','قراءة وفهم المخططات والرسومات الهندسية'),question('quantity','حصر الكميات وQuantity Take-off'),question('boq','إعداد ومراجعة BOQ والمستخلصات'),question('software','إتقان البرامج الهندسية المطلوبة'),question('shop','إعداد ومراجعة Shop Drawings وAs-Built'),question('rfi_material','التعامل مع RFIs وMaterial Submittals'),question('problem_solving','تحليل المشكلات الفنية واقتراح الحلول'),question('coordination','التنسيق مع الموقع والاستشاري والمقاولين'),final('technical_fit','الملاءمة النهائية للوظيفة الهندسية')]
const project:Question[]=[
 first('project_experience','خبرة إدارة المشاريع والمشاريع المماثلة'),question('planning','إدارة البرنامج الزمني ونسب الإنجاز'),question('cost','إدارة التكاليف والموازنة والمستخلصات'),question('contracts','إدارة العقود والموردين والمقاولين من الباطن'),question('teams','إدارة فرق العمل والتنسيق بين الإدارات'),question('quality','إدارة الجودة وملاحظات الاستشاري'),question('safety','إدارة السلامة والمخاطر بالمشروع'),question('client','إدارة العلاقة مع المالك والاستشاري'),question('reporting','التقارير الدورية ورفع المعلومات للإدارة'),final('project_fit','الملاءمة النهائية لإدارة المشروع')]
const accounting:Question[]=[
 first('accounting_experience','الخبرة المحاسبية المرتبطة بالوظيفة'),question('site_accounting','المحاسبة ومستندات المشاريع والمواقع'),question('financial_reporting','إعداد التقارير والتسويات المالية'),question('cost_control','متابعة التكاليف ومراكز التكلفة'),question('invoices','مراجعة الفواتير والمستخلصات'),question('systems','إتقان أنظمة المحاسبة وExcel'),question('compliance','الالتزام بالضوابط والسياسات المحاسبية'),question('analysis','التحليل المالي واكتشاف الأخطاء'),question('accuracy','الدقة وسلامة المستندات'),final('accounting_fit','الملاءمة النهائية للإدارة المالية')]
const procurement:Question[]=[
 first('procurement_experience','الخبرة في المشتريات والتوريد'),question('supplier','إدارة الموردين ومقارنة العروض'),question('pricing','تحليل الأسعار والتفاوض'),question('materials','معرفة المواد والمواصفات واحتياجات المشاريع'),question('orders','إدارة طلبات وأوامر الشراء'),question('contracts','فهم الشروط والعقود التجارية'),question('erp','استخدام ERP وExcel'),question('delivery','متابعة التوريد ومواعيد التسليم'),question('coordination','التنسيق مع المشاريع والموردين'),final('procurement_fit','الملاءمة النهائية لإدارة المشتريات')]
const sales:Question[]=[
 first('sales_experience','الخبرة في المبيعات وتطوير الأعمال'),question('leads','توليد العملاء والفرص البيعية'),question('negotiation','التفاوض وإغلاق الصفقات'),question('market','معرفة السوق والعملاء'),question('proposals','إعداد العروض والتسعير'),question('relationships','إدارة علاقات العملاء'),question('communication','العرض والتواصل والإقناع'),question('crm','استخدام CRM وتقارير المبيعات'),question('targets','العمل وفق المستهدفات ومؤشرات الأداء'),final('sales_fit','الملاءمة النهائية لإدارة المبيعات وتطوير الأعمال')]
const hse:Question[]=[
 first('hse_experience','الخبرة في الأمن والسلامة والصحة المهنية'),question('risk','تقييم المخاطر وإجراءات السيطرة'),question('inspections','التفتيش وتوثيق الملاحظات'),question('incidents','التعامل مع الحوادث والتحقيقات'),question('training','التوعية والتدريب على السلامة'),question('regulations','معرفة متطلبات ولوائح السلامة'),question('site','متطلبات السلامة في مواقع الإنشاء'),question('reporting','تقارير السلامة والإجراءات التصحيحية'),question('communication','التواصل والتأثير والالتزام بالسلامة'),final('hse_fit','الملاءمة النهائية لإدارة الأمن والسلامة')]
const general:Question[]=[
 first('experience','الخبرة المرتبطة مباشرة بالوظيفة'),question('job_knowledge','المعرفة العملية بمهام الوظيفة'),question('tools','إتقان الأدوات والبرامج المطلوبة'),question('problem_solving','حل المشكلات واتخاذ القرار'),question('accuracy','الدقة وجودة تنفيذ الأعمال'),question('planning','التنظيم وإدارة الأولويات'),question('coordination','التنسيق مع الإدارات ذات العلاقة'),question('communication','التواصل والاحترافية'),question('adaptability','المرونة وسرعة التعلم'),final('job_fit','الملاءمة النهائية للوظيفة')]
const normalize=(v:string)=>v.toLowerCase().replace(/[إأآ]/g,'ا').replace(/ة/g,'ه')
export function getSpecializedProfile(exactType:string|null|undefined){
 const t=normalize(exactType||'')
 if(/مدير\s*مشروع|مدراء\s*المشاريع|project\s*manager/.test(t))return {department:'إدارة المشاريع',questions:project}
 if(/محاسب|حسابات|ماليه|مالية|accountant|accounting|finance/.test(t))return {department:'الإدارة المالية',questions:accounting}
 if(/مشتريات|توريد|procurement|purchasing|buyer/.test(t))return {department:'إدارة المشتريات والتوريد',questions:procurement}
 if(/مبيعات|تسويق|تطوير\s*اعمال|تطوير\s*أعمال|sales|marketing|business\s*development/.test(t))return {department:'إدارة المبيعات وتطوير الأعمال',questions:sales}
 if(/امن\s*وسلامه|أمن\s*وسلامة|سلامه|سلامة|hse|safety/.test(t))return {department:'إدارة الأمن والسلامة',questions:hse}
 if(/مهندس|هندسي|معماري|مدني|كهرباء|كهربائي|ميكانيك|ميكانيكي|مكتب\s*فني|مشرف\s*موقع|مهندس\s*موقع|engineering|engineer|technical\s*office|architect|civil|electrical|mechanical|site\s*engineer/.test(t))return {department:'الإدارة الهندسية',questions:engineering}
 if(/موارد\s*بشريه|موارد\s*بشرية|hr|human\s*resources/.test(t))return {department:'إدارة الموارد البشرية',questions:general}
 if(/مستودع|مخازن|مخزن|لوجست|حركه|حركة|سائق|warehouse|logistics|fleet|transport/.test(t))return {department:'إدارة المستودعات والحركة',questions:general}
 if(/مبرمج|برمجه|برمجة|تقنيه|تقنية|معلومات|it|developer|programmer|web/.test(t))return {department:'إدارة تقنية المعلومات',questions:general}
 if(/مصمم|جرافيك|تصميم|graphic|designer|design/.test(t))return {department:'إدارة التصميم',questions:general}
 if(/عقود|contract/.test(t))return {department:'إدارة العقود',questions:general}
 if(/جوده|جودة|quality/.test(t))return {department:'إدارة الجودة',questions:general}
 return {department:'الإدارة المختصة بالوظيفة',questions:general}
}
