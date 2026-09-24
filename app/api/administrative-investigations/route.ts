import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const ALLOWED = ['admin','hr','manager']

type Employee = { id:string; full_name:string; job_title?:string; department?:string }

const normalize = (s:string) => String(s||'').trim().replace(/\s+/g,' ')

function buildQuestions(subject:string, employee?:Employee){
  const s=normalize(subject)
  const q:string[] = [
    `صف الواقعة محل التحقيق بالتسلسل الزمني، موضحاً التاريخ والمشروع أو الموقع والأشخاص الذين كانوا حاضرين.`,
    `ما كانت مهمتك ومسؤوليتك المباشرة وقت الواقعة، وما التعليمات أو الإجراء المعتمد الذي كان يجب اتباعه؟`,
    `ما الذي قمت به فعلياً منذ بداية الواقعة حتى انتهائها؟ اذكر الخطوات والقرارات التي اتخذتها دون اختصار.`,
    `من وجه إليك التعليمات المتعلقة بالواقعة؟ ومتى وكيف تم إبلاغك بها؟ وهل كانت التعليمات واضحة بالنسبة لك؟`,
    `هل ترى أن ما حدث كان نتيجة خطأ منك أو من طرف آخر أو لظرف خارج عن إرادتك؟ وضح مسؤولية كل طرف كما تراها.`,
    `هل ترتب على الواقعة تعطيل للأعمال أو تأخير في البرنامج أو إعادة تنفيذ أو خسارة مالية أو مخالفة تعاقدية أو نظامية؟ وضح بالتفصيل.`,
    `ما المستندات أو الصور أو الرسائل أو أوامر العمل أو سجلات الموقع التي تؤيد أقوالك؟ ومن هم الشهود الذين يمكن الرجوع إليهم؟`,
    `هل أبلغت مدير المشروع أو المسؤول المباشر بالواقعة عند حدوثها؟ إذا لم تبلغ، فما سبب عدم الإبلاغ؟`,
    `هل سبق أن تم تنبيهك أو توجيهك بشأن نفس التصرف أو مخالفة مماثلة؟ اذكر ما تتذكره دون افتراضات.`,
    `ما الإجراء الذي كان بإمكانك اتخاذه لمنع الواقعة أو تقليل آثارها؟ ولماذا لم يتم اتخاذه إن كان ذلك ممكناً؟`,
    `هل لديك أي مستند أو واقعة إضافية ترى أنها ضرورية لفهم الموضوع بصورة عادلة وكاملة؟`,
    `ما ردك النهائي على موضوع التحقيق، وما الذي تطلب إثباته في محضر أقوالك؟`
  ]
  const add=(x:string)=>{if(!q.includes(x)) q.splice(Math.min(5,q.length),0,x)}
  if(/مركب|سيار|سائق|حرك|نقل|مرور/.test(s)){
    add(`من كان مخولاً بقيادة المركبة أو استلامها؟ وما المستند أو التفويض الذي تم الاعتماد عليه قبل التسليم أو التشغيل؟`)
    add(`هل تم فحص رخصة السائق وتصريح القيادة ووثائق المركبة قبل الواقعة؟ ومن قام بذلك؟`)
  }
  if(/سلامة|حادث|اصاب|مخاطر|وقاية|هندسي|موقع/.test(s)){
    add(`ما تعليمات السلامة والصحة المهنية السارية في الموقع بشأن الواقعة؟ وما الذي تم تنفيذه منها وما الذي لم ينفذ؟`)
    add(`هل تم إيقاف العمل أو عزل منطقة الخطر أو إبلاغ مسؤول السلامة عند ظهور الخطر؟ اشرح ما تم اتخاذه.`)
  }
  if(/تأخير|تعطيل|برنامج|تنفيذ|مشروع|مستخلص|جودة|استلام/.test(s)){
    add(`ما أثر الواقعة على البرنامج التنفيذي للمشروع أو تسلسل الأعمال أو اعتماد الأعمال من الاستشاري أو العميل؟`)
    add(`هل ترتب على الواقعة إعادة عمل أو رفض أعمال أو ملاحظة جودة أو مطالبة مالية؟ اذكر ما يثبت ذلك إن وجد.`)
  }
  if(/مشتريات|شراء|توريد|مورد|عقد|مقاول|مستخلص|فاتورة|عهد|مبلغ|مالي/.test(s)){
    add(`ما الإجراء المالي أو الإجرائي المعتمد في الشركة للشراء أو التوريد أو الصرف في هذه الواقعة، وأين حدث الاختلاف عنه؟`)
    add(`من اعتمد الطلب أو الاستلام أو الصرف؟ وما المستندات التي تثبت مسار الاعتماد والتنفيذ؟`)
  }
  if(/غياب|تأخير|دوام|حضور|انقطاع/.test(s)){
    add(`هل كان لديك إذن أو عذر موثق؟ ومتى أبلغت المسؤول المباشر، وما وسيلة الإبلاغ؟`)
  }
  if(/سلوك|لفظ|اعتداء|مشاجرة|إساءة|احترام/.test(s)){
    add(`ما الذي قيل أو حدث تحديداً، ومن كان حاضراً؟ وهل سبق الواقعة خلاف أو توجيه متعلق بها؟`)
  }
  return q.slice(0,16)
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
  return fetch(`${URL}/rest/v1/${path}`,{...init,headers:{...(auth?supabaseHeaders(auth):{}),...(init.headers||{})}})
}

export async function GET(req:NextRequest){
  const auth=await getServerAuth(req,ALLOWED)
  const token=req.nextUrl.searchParams.get('token')
  const reviewToken=req.nextUrl.searchParams.get('reviewToken')
  if(token){
    const r=await db(`administrative_investigation_parties?select=id,investigation_id,employee_id,questions,answers,employee_submitted_at,administrative_investigations(id,subject,status,created_at,updated_at)&employee_token=eq.${token}&limit=1`,{cache:'no-store'})
    if(!r.ok)return NextResponse.json({error:'الرابط غير صالح'},{status:404})
    const rows=await r.json(); if(!rows[0])return NextResponse.json({error:'الرابط غير صالح'},{status:404})
    const party=rows[0]
    const er=await db(`employee_records?select=id,full_name,job_title,department&id=eq.${party.employee_id}&limit=1`,{cache:'no-store'})
    const employee=(await er.json())[0]||null
    return NextResponse.json({party,employee,investigation:party.administrative_investigations})
  }
  if(reviewToken){
    const r=await db(`administrative_investigation_reviews?select=*,administrative_investigations(id,subject,status,created_at,updated_at)&review_token=eq.${reviewToken}&limit=1`,{cache:'no-store'})
    if(!r.ok)return NextResponse.json({error:'الرابط غير صالح'},{status:404})
    const rows=await r.json(); if(!rows[0])return NextResponse.json({error:'الرابط غير صالح'},{status:404})
    const review=rows[0]
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
      const r=await db(`administrative_investigation_parties?employee_token=eq.${publicToken}`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({answers:body.answers||[],employee_submitted_at:new Date().toISOString()})})
      if(!r.ok)return NextResponse.json({error:'تعذر حفظ الأقوال'},{status:500})
      return NextResponse.json({ok:true})
    }
    if(body.action==='management-opinion'){
      const r=await db(`administrative_investigation_reviews?review_token=eq.${publicToken}`,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({department_name:body.department_name||'',reviewer_name:body.reviewer_name||'',opinion:body.opinion||'',submitted_at:new Date().toISOString()})})
      if(!r.ok)return NextResponse.json({error:'تعذر حفظ رأي الإدارة'},{status:500})
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
