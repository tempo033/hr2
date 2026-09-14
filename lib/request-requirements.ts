export type SuggestedRequirement = {
  name: string
  category: string
  required?: boolean
}

export const REQUEST_REQUIREMENTS: Record<string, SuggestedRequirement[]> = {
  'مهندس مشاريع': [
    { name: 'بكالوريوس هندسة مدنية أو تخصص مناسب', category: 'مؤهل', required: true },
    { name: 'خبرة في إدارة وتنفيذ مشاريع المقاولات', category: 'خبرة', required: true },
    { name: 'قراءة وفهم المخططات التنفيذية', category: 'مهارة فنية', required: true },
    { name: 'إدارة فرق العمل والمقاولين', category: 'إدارة', required: true },
    { name: 'إعداد ومراجعة المستخلصات وحصر الكميات', category: 'مهارة فنية' },
    { name: 'إعداد التقارير ومتابعة البرنامج الزمني', category: 'إدارة' },
    { name: 'AutoCAD وExcel', category: 'برنامج هندسي' },
    { name: 'السلامة والجودة في مواقع الإنشاء', category: 'تشغيل' },
  ],
  'مهندس مكتب فني': [
    { name: 'بكالوريوس هندسة مدنية أو معمارية حسب التخصص', category: 'مؤهل', required: true },
    { name: 'خبرة في أعمال المكتب الفني بالمقاولات', category: 'خبرة', required: true },
    { name: 'إعداد ومراجعة Shop Drawings', category: 'مهارة فنية', required: true },
    { name: 'حصر الكميات وQuantity Take-off', category: 'مهارة فنية', required: true },
    { name: 'إعداد ومراجعة BOQ والمستخلصات', category: 'مهارة فنية', required: true },
    { name: 'RFIs وMaterial Submittals وAs-Built', category: 'مهارة فنية' },
    { name: 'AutoCAD وExcel', category: 'برنامج هندسي', required: true },
    { name: 'Revit / BIM', category: 'برنامج هندسي' },
  ],
  'مهندس مشروع': [
    { name: 'بكالوريوس هندسة', category: 'مؤهل', required: true },
    { name: 'خبرة في تنفيذ وإدارة المشاريع', category: 'خبرة', required: true },
    { name: 'قراءة المخططات ومتابعة التنفيذ بالموقع', category: 'مهارة فنية', required: true },
    { name: 'حصر الكميات ومتابعة المواد', category: 'مهارة فنية' },
    { name: 'إدارة المقاولين والعمالة', category: 'إدارة' },
    { name: 'إعداد التقارير اليومية والأسبوعية', category: 'إدارة' },
    { name: 'AutoCAD وExcel', category: 'برنامج هندسي' },
  ],
  'مهندس مشتريات': [
    { name: 'بكالوريوس هندسة أو إدارة مشتريات مناسبة', category: 'مؤهل', required: true },
    { name: 'خبرة في مشتريات مواد ومعدات المقاولات', category: 'خبرة', required: true },
    { name: 'قراءة المواصفات والمخططات وحصر الاحتياج', category: 'مهارة فنية' },
    { name: 'طلب عروض الأسعار ومقارنة الموردين', category: 'مشتريات', required: true },
    { name: 'التفاوض ومتابعة التوريد والتسليم', category: 'مشتريات', required: true },
    { name: 'Excel وإعداد جداول المقارنة', category: 'برنامج' },
    { name: 'رخصة قيادة', category: 'متطلبات عامة' },
  ],
  'محاسب موقع': [
    { name: 'بكالوريوس محاسبة', category: 'مؤهل', required: true },
    { name: 'خبرة في محاسبة مواقع المقاولات', category: 'خبرة', required: true },
    { name: 'إدارة المصروفات والعهد والمستندات المالية', category: 'محاسبة', required: true },
    { name: 'مطابقة الفواتير والمستخلصات', category: 'محاسبة' },
    { name: 'إعداد التقارير والحركة النقدية للموقع', category: 'محاسبة' },
    { name: 'Excel والأنظمة المحاسبية', category: 'برنامج' },
  ],
  'مسؤول حركة': [
    { name: 'خبرة في إدارة حركة السيارات والمعدات', category: 'خبرة', required: true },
    { name: 'متابعة السائقين والمركبات والمعدات', category: 'تشغيل', required: true },
    { name: 'تنظيم الإيجارات والتشغيل والصيانة', category: 'تشغيل', required: true },
    { name: 'إعداد تقارير الحركة اليومية', category: 'إدارة' },
    { name: 'رخصة قيادة سارية', category: 'متطلبات عامة', required: true },
  ],
  'مدخل بيانات': [
    { name: 'إجادة إدخال البيانات بسرعة ودقة', category: 'مهارة', required: true },
    { name: 'إجادة Excel وWord', category: 'برنامج', required: true },
    { name: 'تنظيم الملفات والمستندات', category: 'إدارة' },
    { name: 'دقة ومراجعة البيانات', category: 'مهارة', required: true },
    { name: 'العمل على أنظمة الموارد البشرية أو ERP', category: 'برنامج' },
  ],
  'موارد بشرية': [
    { name: 'بكالوريوس موارد بشرية أو إدارة أعمال', category: 'مؤهل', required: true },
    { name: 'خبرة في إدارة شؤون الموظفين والتوظيف', category: 'خبرة', required: true },
    { name: 'إجادة أنظمة العمل واللوائح السعودية', category: 'أنظمة', required: true },
    { name: 'إدارة ملفات الموظفين والعقود والإجازات', category: 'موارد بشرية', required: true },
    { name: 'إجراء المقابلات وتقييم المرشحين', category: 'توظيف' },
    { name: 'Excel وأنظمة HR', category: 'برنامج' },
  ],
  'تدريب تعاوني': [
    { name: 'خطاب تدريب تعاوني من الجهة التعليمية', category: 'مؤهل', required: true },
    { name: 'تخصص متوافق مع مجال التدريب', category: 'مؤهل', required: true },
    { name: 'الالتزام بالحضور والانضباط', category: 'سلوك', required: true },
    { name: 'القدرة على التعلم والعمل ضمن فريق', category: 'مهارة' },
  ],
  'تدريب صيفي': [
    { name: 'إثبات الدراسة أو خطاب التدريب', category: 'مؤهل', required: true },
    { name: 'تخصص مناسب للفرصة التدريبية', category: 'مؤهل', required: true },
    { name: 'الالتزام بالحضور والانضباط', category: 'سلوك', required: true },
  ],
  'تدريب مهني': [
    { name: 'مؤهل أو برنامج مهني مناسب', category: 'مؤهل', required: true },
    { name: 'مهارات أساسية مرتبطة بالتخصص', category: 'مهارة', required: true },
    { name: 'الالتزام بالتدريب والتعليمات', category: 'سلوك', required: true },
  ],
  'تجربة وظيفية': [
    { name: 'خبرة أو مؤهل مناسب للوظيفة', category: 'مؤهل' },
    { name: 'القدرة على تنفيذ مهام الوظيفة عمليًا', category: 'مهارة', required: true },
    { name: 'الالتزام والانضباط', category: 'سلوك', required: true },
    { name: 'التواصل والعمل ضمن فريق', category: 'مهارة' },
  ],
  'فترة تجربة': [
    { name: 'استيفاء متطلبات الوظيفة الأساسية', category: 'مؤهل', required: true },
    { name: 'القدرة على أداء المهام خلال فترة التجربة', category: 'مهارة', required: true },
    { name: 'الالتزام بالدوام والتعليمات', category: 'سلوك', required: true },
  ],
  'تجربة ميدانية': [
    { name: 'خبرة أو مؤهل مناسب للعمل الميداني', category: 'مؤهل' },
    { name: 'القدرة على العمل في موقع المشروع', category: 'تشغيل', required: true },
    { name: 'الالتزام بالسلامة والتعليمات', category: 'سلامة', required: true },
  ],
  'تقييم موظف': [
    { name: 'جودة أداء المهام الوظيفية', category: 'أداء', required: true },
    { name: 'الالتزام والانضباط', category: 'سلوك', required: true },
    { name: 'التعاون والعمل ضمن الفريق', category: 'سلوك' },
    { name: 'المبادرة وحل المشكلات', category: 'أداء' },
  ],
  'تقييم مرشح': [
    { name: 'مطابقة المؤهل والخبرة لمتطلبات الوظيفة', category: 'مؤهل', required: true },
    { name: 'المهارات الفنية المطلوبة', category: 'مهارة فنية', required: true },
    { name: 'القدرة على التواصل والعمل ضمن فريق', category: 'سلوك' },
    { name: 'نتيجة المقابلة والتقييم العملي', category: 'تقييم', required: true },
  ],
  'تقييم أداء': [
    { name: 'تحقيق أهداف ومؤشرات الأداء', category: 'أداء', required: true },
    { name: 'جودة العمل والإنتاجية', category: 'أداء', required: true },
    { name: 'الالتزام بالسياسات والإجراءات', category: 'سلوك' },
    { name: 'التطور وتحمل المسؤولية', category: 'أداء' },
  ],
}

export const getSuggestedRequirements = (exactType: string): SuggestedRequirement[] => REQUEST_REQUIREMENTS[exactType] || []
