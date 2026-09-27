import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const ALLOWED = ['admin','hr','manager']

type Employee = { id:string; full_name:string; job_title?:string; department?:string }

const normalize = (s:string) => String(s||'').trim().replace(/\s+/g,' ')

function buildQuestions(subject:string, employee?:Employee){
  const s=normalize(subject)
  const q:string[]=[]
  const add=(x:string)=>{if(q.length<8&&!q.includes(x))q.push(x)}
  const role=employee?.job_title?` بوصفك ${employee.job_title}`:''
  add(`بخصوص الواقعة محل التحقيق، اشرح ما حدث من بدايته إلى نهايته، وما الذي قمت به أنت تحديداً${role}؟`)
  if(/غياب|تأخير|دوام|حضور|انقطاع/.test(s)){
    add('ما كان موعد أو تعليمات الحضور التي كان يفترض الالتزام بها في اليوم محل التحقيق؟')
    add('متى علمت أنك ستتأخر أو لن تحضر، ومتى أبلغت المسؤول المباشر؟')
    add('هل حصلت على إذن أو موافقة مسبقة؟ وإذا لم تحصل، فما السبب؟')
    add('هل قدمت عذراً أو مستنداً يثبت سبب الغياب أو التأخر؟')
    add('ما الذي ترتب على عدم حضورك أو تأخرك من ناحية العمل، ومن قام بمهامك خلال تلك الفترة؟')
  } else if(/اعتداء|ضرب|جسدي|مشاجرة|إساءة|تهديد|سب|شتم|لفظ/.test(s)){
    add('من كان موجوداً وقت الواقعة، وما الذي قيل أو حدث أمامهم؟')
    add('ما التصرف الذي صدر منك تجاه الطرف الآخر، وما الذي صدر منه تجاهك قبل ذلك؟')
    add('هل وقع أي احتكاك أو تعدٍ فعلي، ومن بدأه بحسب ما شاهدته؟')
    add('متى أبلغت المسؤول أو الإدارة بالواقعة، وما الإجراء الذي اتخذته بعدها؟')
    add('هل توجد كاميرات أو رسائل أو شهود يمكن الرجوع إليهم للتحقق من أقوالك؟')
  } else if(/مركب|سيار|سائق|حرك|نقل|مرور/.test(s)){
    add('من سلّمك المركبة أو طلب منك استخدامها، ومتى تم ذلك؟')
    add('هل كان لديك تفويض أو تعليمات واضحة باستخدام المركبة؟ وما الذي التزمت به منها؟')
    add('متى وقعت الواقعة أو المخالفة، وماذا حدث للمركبة بالتحديد؟')
    add('هل نتجت غرامة أو ضرر أو تعطيل للعمل، وما المستند الذي يثبت ذلك؟')
    add('من كان موجوداً أو يعلم باستخدام المركبة وقت الواقعة؟')
  } else if(/سلامة|حادث|اصاب|مخاطر|وقاية/.test(s)){
    add('ما تعليمات السلامة التي كانت مطبقة على العمل وقت الواقعة، وماذا طُلب منك؟')
    add('ماذا فعلت قبل وقوع الحادث أو ظهور الخطر، ومتى لاحظت المشكلة؟')
    add('ماذا فعلت فور وقوع الحادث أو اكتشاف الخطر، ومن أبلغت؟')
    add('هل نتجت إصابة أو تلف أو توقف للعمل، وما التقرير أو المحضر الذي يثبت ذلك؟')
    add('من كان موجوداً في الموقع ويمكن الرجوع إليه كشاهد على الواقعة؟')
  } else if(/مشتريات|شراء|توريد|مورد|عقد|مقاول|فاتورة|عهد|مبلغ|مالي|صرف/.test(s)){
    add('ما الإجراء الذي كنت مسؤولاً عنه في هذه المعاملة، وما الصلاحية التي كانت لديك؟')
    add('ما الخطوات التي قمت بها فعلياً، ومن قام بالاعتماد أو الاستلام أو الصرف؟')
    add('هل تم تنفيذ الإجراء وفق التعليمات والمستندات المعتمدة؟ وإذا لا، فما الذي حدث؟')
    add('ما المستندات المرتبطة بالمعاملة التي يمكن الرجوع إليها للتحقق من أقوالك؟')
    add('هل ترتب على الواقعة مبلغ أو خسارة أو التزام على الشركة، وما أساس تحديده؟')
  } else if(/رسالة|واتساب|بلاغ|إبلاغ|مراسلة|جروب/.test(s)){
    add('متى علمت بالموضوع، ومتى كان مطلوباً منك إبلاغ المسؤول عنه؟')
    add('هل أرسلت أو استلمت رسالة بخصوص الواقعة؟ اذكر وقتها والجهة التي أرسلت إليها أو استلمت منها.')
    add('إذا لم يتم الإبلاغ في الوقت المطلوب، فما السبب؟')
    add('هل توجد الرسالة أو المحادثة في المجموعة أو البريد الرسمي ويمكن الرجوع إليها؟')
  } else if(/تأخير|تعطيل|إهمال|تقصير|جودة|استلام|مشروع|تنفيذ|موقع/.test(s)){
    add('ما التكليف أو العمل الذي كان مطلوباً منك، ومتى تم توجيهك به؟')
    add('ماذا أنجزت فعلياً، ومتى تم التنفيذ أو التوقف عن التنفيذ؟')
    add('إذا لم يتم العمل كما هو مطلوب، ما السبب الفعلي لذلك؟')
    add('متى أبلغت المسؤول بالمشكلة، وما وسيلة الإبلاغ التي استخدمتها؟')
    add('ما الأثر الذي ترتب على الواقعة، وهل يوجد محضر أو صورة أو سجل يثبته؟')
    add('من كان موجوداً في الموقع أو شارك في استلام العمل ويمكن الرجوع إليه؟')
  } else {
    add(`ما التعليمات أو التكليف المرتبط بموضوع التحقيق: «${subject.replace(/`/g,'').slice(0,180)}»، ومن قام بتوجيهه إليك؟`)
    add('ما الذي قمت به بعد استلام التكليف، وما الذي لم يتم تنفيذه إن وجد؟')
    add('متى علمت بوجود المشكلة، ومتى أبلغت المسؤول المباشر؟')
    add('ما السبب المباشر الذي أدى إلى الواقعة من وجهة نظرك؟')
    add('ما المستند أو السجل أو الرسالة أو الشخص الذي يمكن الرجوع إليه للتحقق من أقوالك؟')
  }
  return q.slice(0,8)
}
function analyze(subject:string, parties:any[], managementOpinion:string){
  const allAnswers=parties.flatMap(p=>p.answers||[]).map((a:any)=>normalize(a.answer)).filter(Boolean)
  const text=(subject+' '+allAnswers.join(' ')+' '+managementOpinion).toLowerCase()
  const admitted=/(أقر|أعترف|صحيح|قمت|أخطأت|أهملت|لم ألتزم|لم أبلغ|نعم،)/i.test(text)
  const denied=/(أنفي|لم أقم|غير صحيح|لا أوافق|أرفض الاتهام|أنكر)/i.test(text)
  const harm=/(خسار|غرام|ضرر|تعطيل|تأخير|تلف|حادث|مخالفة|إعادة عمل|رفض أعمال)/i.test(text)
  const repeat=/(سبق|تكرار|مرة أخرى|إنذار سابق|تنبيه سابق|مخالفة مماثلة)/i.test(text)
  const serious80=/(اعتداء جسدي|تزوير|سرقة|اختلاس|رشوة|إفشاء سر|تعمد إحداث خسارة|إتلاف عمد)/i.test(text)
  const options:any[]=[
    {penalty:'الإنذار',basis:'المادة 66 من نظام العمل',when:'عند ثبوت المخالفة واستحقاق الجزاء بما يتناسب مع جسامتها وظروفها وسجل الموظف.'},
    {penalty:'الغرامة',basis:'المادتان 66 و70 من نظام العمل',when:'عند ثبوت المخالفة، مع مراعاة الحدود النظامية للغرامة وعدم تجاوز أجر خمسة أيام عن المخالفة الواحدة والقيود الشهرية المنصوص عليها.'},
    {penalty:'الحرمان أو تأجيل العلاوة لمدة لا تزيد على سنة',basis:'المادة 66 من نظام العمل',when:'إذا كانت العلاوة مقررة وفق النظام/اللائحة الداخلية وتناسب الجزاء مع المخالفة المثبتة.'},
    {penalty:'تأجيل الترقية لمدة لا تزيد على سنة',basis:'المادة 66 من نظام العمل',when:'إذا كانت الترقية مقررة وتوافرت أسباب الجزاء وتناسبه مع المخالفة.'},
    {penalty:'الإيقاف عن العمل مع الحرمان من الأجر',basis:'المادتان 66 و70 من نظام العمل',when:'إذا كانت جسامة المخالفة تبرر ذلك، مع مراعاة الحد النظامي للإيقاف.'}
  ]
  if(serious80) options.push({penalty:'الفصل وفق المادة 80',basis:'المادة 80 من نظام العمل',when:'لا يدرج إلا إذا ثبتت إحدى الحالات المحددة حصراً في المادة 80 واستوفيت شروطها وأتيح للعامل إبداء أسباب معارضته.'})
  const summary = denied && !admitted
    ? 'الأقوال تتضمن إنكاراً للواقعة أو المسؤولية؛ يلزم وزنها مقابل المستندات والشهود وسجلات المشروع قبل اعتماد أي نتيجة.'
    : admitted
      ? 'الأقوال تتضمن مؤشرات على إقرار ببعض الوقائع؛ يجب تحديد ما أُقر به بدقة ومقارنته بالأدلة وتحديد درجة المسؤولية لكل طرف.'
      : 'لا يظهر من الأقوال إقرار صريح كافٍ؛ يلزم استكمال مقارنة الأقوال بالأدلة والمستندات وشهادة الأطراف ذات الصلة.'
  return {
    summary,
    indicators:{admitted,denied,harm,repeat,serious80},
    options,
    legalControls:[
      'يجب أن يكون الجزاء متناسباً مع المخالفة والظروف المحيطة بها، ووفق لائحة تنظيم العمل المعتمدة.',
      'لا يوقع الجزاء قبل إبلاغ العامل بما نسب إليه واستجوابه وتحقيق دفاعه وإثبات ذلك في محضر وفق المادة 71.',
      'لا يجوز توقيع أكثر من جزاء واحد عن المخالفة الواحدة وفق المادة 70.',
      'يجب مراعاة الحدود النظامية للغرامة والإيقاف، وقيود توقيع الجزاء ومواعيده وفق المواد 69 و70.',
      'يجب إبلاغ العامل بقرار الجزاء كتابةً، مع مراعاة حقه في التظلم وفق المادة 72.',
      'التحليل آلي مساعد ولا يحل محل التحقق من الوقائع والمستندات أو القرار الإداري المختص.'
    ],
    recommendation: admitted && harm
      ? 'توجد مؤشرات تستدعي المفاضلة بين الجزاءات بعد التحقق من الأدلة ودرجة الضرر والسجل التأديبي ودور كل طرف.'
      : 'لا يوصى باعتماد جزاء نهائي قبل اكتمال الأدلة وسماع جميع الأطراف ورأي الإدارة المختصة.'
  }
}

async function db(path:string, init:any, auth?:any){
  const serviceKey=auth?.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const headers:any={apikey:serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',...(serviceKey?{Authorization:`Bearer ${serviceKey}`}:{})}
  if(auth) Object.assign(headers,supabaseHeaders(auth))
  return fetch(`${URL}/rest/v1/${path}`,{...init,headers:{...headers,...(init.headers||{})}})
}

export async function GET(req:NextRequest){
  const auth=await getServerAuth(req,ALLOWED)
  const token=req.nextUrl.searchParams.get('token')
  const reviewToken=req.nextUrl.searchParams.get('reviewToken')
  if(token){
    const r=await db(`administrative_investigation_parties?select=id,investigation_id,employee_id,questions,answers,employee_token,employee_submitted_at,administrative_investigations(id,subject,status,created_at,updated_at)&employee_token=eq.${token}&limit=1`,{cache:'no-store'})
    if(!r.ok)return NextResponse.json({error:'الرابط غير صالح'},{status:404})
    const rows=await r.json(); if(!rows[0])return NextResponse.json({error:'الرابط غير صالح'},{status:404})
    const party=rows[0]
    if(party.employee_submitted_at)return NextResponse.json({error:'تم إرسال أقوالك مسبقاً، ولا يمكن فتح الرابط أو تعديل الإجابات مرة أخرى.'},{status:410})
    const er=await db(`employee_records?select=id,full_name,job_title,department&id=eq.${party.employee_id}&limit=1`,{cache:'no-store'})
    const employee=(await er.json())[0]||null
    return NextResponse.json({party,employee,investigation:party.administrative_investigations})
  }
  if(reviewToken){
    const r=await db(`administrative_investigation_reviews?select=*,administrative_investigations(id,subject,status,created_at,updated_at)&review_token=eq.${reviewToken}&limit=1`,{cache:'no-store'})
    if(!r.ok)return NextResponse.json({error:'الرابط غير صالح'},{status:404})
    const rows=await r.json(); if(!rows[0])return NextResponse.json({error:'الرابط غير صالح'},{status:404})
    const review=rows[0]
    if(review.submitted_at)return NextResponse.json({error:'تم إرسال رأي الإدارة مسبقاً، ولا يمكن فتح الرابط أو تعديل البيانات مرة أخرى.'},{status:410})
    const pr=await db(`administrative_investigation_parties?select=*&investigation_id=eq.${review.investigation_id}`,{cache:'no-store'})
    const parties=pr.ok?await pr.json():[]
    const enriched=[]
    for(const p of parties){
      const er=await db(`employee_records?select=id,full_name,job_title,department&id=eq.${p.employee_id}&limit=1`,{cache:'no-store'})
      enriched.push({...p,employee:(await er.json())[0]||null})
    }
    return NextResponse.json({review,parties:enriched,investigation:review.administrative_investigations})
  }
  if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const [er,ir,rr]=await Promise.all([
    db('employee_records?select=id,full_name,job_title,department&order=full_name.asc',{cache:'no-store'},auth),
    db('administrative_investigations?select=*&order=created_at.desc',{cache:'no-store'},auth),
    db('administrative_investigation_reviews?select=*&order=created_at.desc',{cache:'no-store'},auth)
  ])
  return NextResponse.json({employees:er.ok?await er.json():[],investigations:ir.ok?await ir.json():[],reviews:rr.ok?await rr.json():[]},{headers:{'Cache-Control':'no-store'}})
}

export async function POST(req:NextRequest){
  const body=await req.json()
  const publicToken=body.token
  if(publicToken){
    if(body.action==='employee-answer'){
      const existing=await db(`administrative_investigation_parties?select=id,employee_submitted_at&employee_token=eq.${publicToken}&limit=1`,{cache:'no-store'})
      if(!existing.ok)return NextResponse.json({error:'الرابط غير صالح'},{status:404})
      const existingRows=await existing.json(); if(!existingRows[0])return NextResponse.json({error:'الرابط غير صالح'},{status:404})
      if(existingRows[0].employee_submitted_at)return NextResponse.json({error:'تم إرسال أقوالك مسبقاً، ولا يمكن تعديل الإجابات مرة أخرى.'},{status:409})
      const r=await db(`administrative_investigation_parties?id=eq.${existingRows[0].id}&employee_submitted_at=is.null`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({answers:body.answers||[],employee_submitted_at:new Date().toISOString()})})
      if(!r.ok)return NextResponse.json({error:'تعذر حفظ الأقوال'},{status:500})
      const saved=await r.json(); if(!saved[0])return NextResponse.json({error:'تم إرسال الأقوال مسبقاً، ولا يمكن تعديلها.'},{status:409})
      return NextResponse.json({ok:true})
    }
    if(body.action==='management-opinion'){
      const existing=await db(`administrative_investigation_reviews?select=id,submitted_at&review_token=eq.${publicToken}&limit=1`,{cache:'no-store'})
      if(!existing.ok)return NextResponse.json({error:'الرابط غير صالح'},{status:404})
      const existingRows=await existing.json(); if(!existingRows[0])return NextResponse.json({error:'الرابط غير صالح'},{status:404})
      if(existingRows[0].submitted_at)return NextResponse.json({error:'تم إرسال رأي الإدارة مسبقاً، ولا يمكن تعديله مرة أخرى.'},{status:409})
      const r=await db(`administrative_investigation_reviews?id=eq.${existingRows[0].id}&submitted_at=is.null`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({department_name:body.department_name||'',reviewer_name:body.reviewer_name||'',opinion:body.opinion||'',submitted_at:new Date().toISOString()})})
      if(!r.ok)return NextResponse.json({error:'تعذر حفظ رأي الإدارة'},{status:500})
      const saved=await r.json(); if(!saved[0])return NextResponse.json({error:'تم إرسال رأي الإدارة مسبقاً، ولا يمكن تعديله.'},{status:409})
      return NextResponse.json({ok:true})
    }
  }
  const auth=await getServerAuth(req,ALLOWED); if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const action=body.action||'questions'
  if(action==='questions'){
    return NextResponse.json({questions:buildQuestions(body.subject||'',body.employee)})
  }
  if(action==='create'){
    const employeeIds=[...new Set((body.employee_ids||[]).filter(Boolean))]
    if(!employeeIds.length||!normalize(body.subject))return NextResponse.json({error:'اختر موظفاً واحداً على الأقل واكتب موضوع التحقيق'},{status:400})
    const invR=await db('administrative_investigations',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({employee_id:employeeIds[0],subject:normalize(body.subject),questions:[],answers:[],status:'in_progress'})},auth)
    if(!invR.ok)return NextResponse.json({error:await invR.text()},{status:500})
    const inv=(await invR.json())[0]
    const parties=[]
    for(const employee_id of employeeIds){
      const er=await db(`employee_records?select=id,full_name,job_title,department&id=eq.${employee_id}&limit=1`,{cache:'no-store'},auth)
      const employee=(await er.json())[0]||{}
      const qs=buildQuestions(body.subject,employee)
      const pr=await db('administrative_investigation_parties',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({investigation_id:inv.id,employee_id,questions:qs,answers:[]})},auth)
      if(!pr.ok)return NextResponse.json({error:await pr.text()},{status:500})
      parties.push((await pr.json())[0])
    }
    const review=await db('administrative_investigation_reviews',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({investigation_id:inv.id})},auth)
    const reviewRow=review.ok?(await review.json())[0]:null
    return NextResponse.json({investigation:inv,parties,reviews:reviewRow?[reviewRow]:[]})
  }
  if(action==='update'){
    const id=body.id
    const r=await db(`administrative_investigations?id=eq.${id}`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({subject:normalize(body.subject),status:body.status,updated_at:new Date().toISOString()})},auth)
    if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
    return NextResponse.json({investigation:(await r.json())[0]})
  }
  if(action==='finalize'){
    const id=body.id
    const [pr,rr]=await Promise.all([
      db(`administrative_investigation_parties?select=*&investigation_id=eq.${id}`,{cache:'no-store'},auth),
      db(`administrative_investigation_reviews?select=*&investigation_id=eq.${id}`,{cache:'no-store'},auth)
    ])
    const parties=pr.ok?await pr.json():[], reviews=rr.ok?await rr.json():[]
    const managementOpinion=reviews.map((x:any)=>x.opinion).filter(Boolean).join('\n')
    const analysis=analyze(body.subject||'',parties,managementOpinion)
    const up=await db(`administrative_investigations?id=eq.${id}`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({management_opinion:managementOpinion,final_analysis:analysis,analysis,status:'completed',completed_at:new Date().toISOString(),updated_at:new Date().toISOString()})},auth)
    if(!up.ok)return NextResponse.json({error:await up.text()},{status:500})
    return NextResponse.json({analysis,parties,reviews})
  }
  if(action==='detail'){
    const id=body.id
    const [ir,pr,rr]=await Promise.all([
      db(`administrative_investigations?id=eq.${id}&limit=1`,{cache:'no-store'},auth),
      db(`administrative_investigation_parties?select=*&investigation_id=eq.${id}`,{cache:'no-store'},auth),
      db(`administrative_investigation_reviews?select=*&investigation_id=eq.${id}`,{cache:'no-store'},auth)
    ])
    return NextResponse.json({investigation:(await ir.json())[0],parties:pr.ok?await pr.json():[],reviews:rr.ok?await rr.json():[]})
  }
  return NextResponse.json({error:'طلب غير معروف'},{status:400})
}
