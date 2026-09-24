import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const ALLOWED = ['admin','hr','manager']
const questions = (subject:string) => {
 const s=subject.toLowerCase()
 const common=[
  'ما الذي حدث من وجهة نظرك؟ اذكر الوقائع بالتسلسل والتاريخ والمكان.',
  'ما سبب حدوث الواقعة؟ وهل كان هناك توجيه أو تعليمات سابقة بخصوصها؟',
  'هل كنت تعلم أن التصرف أو عدم التصرف يخالف تعليمات العمل؟ وضح.',
  'هل لديك مستندات أو شهود أو أي أدلة تؤيد أقوالك؟',
  'هل ترتب على الواقعة ضرر أو تعطيل للعمل أو خسارة مالية؟ وما تقديرك لذلك؟',
  'هل سبق تنبيهك أو إنذارك بشأن واقعة مماثلة؟ وضح بالتاريخ إن أمكن.',
  'هل لديك أي ظروف أو أسباب أو مبررات أخرى ترغب في إثباتها في محضر التحقيق؟'
 ]
 if(/غياب|انقطاع|تأخير|حضور|دوام/.test(s)) common.splice(2,0,'هل كان لديك إذن أو عذر رسمي للغياب أو التأخير؟ وهل قمت بإبلاغ المسؤول في حينه؟')
 if(/مركب|سيار|سائق|مرور|نقل/.test(s)) common.splice(2,0,'من أصدر تعليمات تسليم المركبة أو تشغيلها؟ وهل كان السائق أو المستخدم مخولًا بذلك؟')
 if(/سلامة|حادث|اصاب|اصابة|موقع|هندسي|فني/.test(s)) common.splice(2,0,'ما الإجراءات التي اتخذتها أو كان يجب اتخاذها للمحافظة على السلامة ومنع الواقعة؟')
 if(/مال|عهد|مبلغ|فاتورة|شراء|مشتريات|سرقة|اختلاس/.test(s)) common.splice(2,0,'هل كانت هناك مبالغ أو عهد أو مستندات مالية تحت مسؤوليتك؟ وكيف تم التعامل معها؟')
 if(/سلوك|لفظ|اعتداء|مشاجرة|اساءة/.test(s)) common.splice(2,0,'من كان حاضرًا وقت الواقعة؟ وما العبارات أو التصرفات التي صدرت بحسب روايتك؟')
 return common
}
function analyze(subject:string, answers:any[], employee:any){
 const text=answers.map(a=>String(a.answer||'')).join(' ')
 const admitted=/(نعم|أقر|أعترف|صحيح|فعلاً|قمت|أخطأت|أهملت|لم ألتزم|لم أبلغ)/i.test(text)
 const denied=/(أنفي|لم أقم|غير صحيح|لا أوافق|أرفض الاتهام)/i.test(text)
 const harm=/(خسار|غرام|ضرر|تعطيل|تلف|حادث|مخالفة)/i.test(subject+' '+text)
 const repeat=/(سبق|تكرار|مرة أخرى|إنذار سابق|تنبيه سابق)/i.test(text)
 const article80=/(اعتداء|شرف|أمانة|تزوير|سرقة|اختلاس|رشوة|إفشاء سر|عمدًا|تعمد)/i.test(subject+' '+text)
 const options:any[]=[
  {penalty:'إنذار',basis:'جزاء تأديبي وارد في المادة 66 من نظام العمل',when:'إذا ثبتت المخالفة وكانت درجتها محدودة أو لم تستوجب تشديدًا.'},
  {penalty:'غرامة',basis:'المادة 66 والمادة 70',when:'إذا ثبتت المخالفة وكانت الغرامة متناسبة معها، وبحد أقصى أجر خمسة أيام عن المخالفة الواحدة.'},
  {penalty:'حرمان أو تأجيل العلاوة لمدة لا تزيد على سنة',basis:'المادة 66',when:'إذا كانت العلاوة مقررة من صاحب العمل وثبتت المخالفة وتناسب الجزاء معها.'},
  {penalty:'تأجيل الترقية لمدة لا تزيد على سنة',basis:'المادة 66',when:'إذا كانت الترقية مقررة وثبتت المخالفة وتناسب الجزاء معها.'},
  {penalty:'إيقاف عن العمل مع الحرمان من الأجر',basis:'المادة 66 والمادة 70',when:'للمخالفات التي تبرر هذا الجزاء، وبحد أقصى خمسة أيام في الشهر.'}
 ]
 if(article80) options.push({penalty:'الفصل دون مكافأة أو إشعار أو تعويض',basis:'المادة 80',when:'خيار قانوني محتمل فقط إذا ثبتت الواقعة وتوافرت إحدى حالات المادة 80 وشروطها، مع إتاحة الفرصة للعامل لإبداء أسباب معارضته.'})
 return {employee,subject,summary:admitted?'تتضمن الإجابات مؤشرات على إقرار أو قبول بعض الوقائع.':'الإجابات لا تتضمن إقرارًا واضحًا، ويجب مقارنة الأقوال بالأدلة والمستندات.',indicators:{admitted,denied,harm,repeat,article80},options,legalControls:['لا يوقع الجزاء قبل إبلاغ العامل كتابة بما نسب إليه واستجوابه وتحقيق دفاعه وإثبات ذلك في محضر وفق المادة 71.','لا يجوز توقيع أكثر من جزاء واحد عن المخالفة الواحدة وفق المادة 70.','لا تتجاوز الغرامة أجر خمسة أيام عن المخالفة الواحدة، ولا يخصم للغرامات أكثر من أجر خمسة أيام في الشهر.','يجب إبلاغ العامل بقرار الجزاء كتابة، وله حق التظلم وفق المادة 72.'],recommendation:admitted&&harm?'بعد استكمال التحقيق والتحقق من الأدلة، يمكن المفاضلة بين الجزاءات بحسب جسامة المخالفة والضرر والسجل التأديبي.':'لا يُنصح باتخاذ جزاء نهائي قبل استكمال التحقق من الأدلة وسماع دفاع الموظف.'}
}
export async function GET(req:NextRequest){
 const auth=await getServerAuth(req,ALLOWED); if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 const r=await fetch(`${URL}/rest/v1/employee_records?select=id,full_name,job_title,department&order=full_name.asc`,{headers:supabaseHeaders(auth),cache:'no-store'})
 if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
 return NextResponse.json({employees:await r.json()},{headers:{'Cache-Control':'no-store'}})
}
export async function POST(req:NextRequest){
 const auth=await getServerAuth(req,ALLOWED); if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 const body=await req.json(); const action=body.action||'questions'
 if(action==='questions') return NextResponse.json({questions:questions(body.subject||'')})
 if(action==='save'){
  const payload={employee_id:body.employee_id,subject:body.subject,questions:body.questions||[],answers:body.answers||[],analysis:body.analysis||null,status:body.status||'completed',completed_at:body.status==='completed'?new Date().toISOString():null}
  const r=await fetch(`${URL}/rest/v1/administrative_investigations`,{method:'POST',headers:{...supabaseHeaders(auth),'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)})
  if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
  return NextResponse.json({investigation:(await r.json())[0]})
 }
 if(action==='analyze') return NextResponse.json({analysis:analyze(body.subject||'',body.answers||[],body.employee||{})})
 return NextResponse.json({error:'طلب غير معروف'},{status:400})
}