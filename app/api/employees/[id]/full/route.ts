import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth,supabaseHeaders} from '@/lib/server-auth'
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr','manager','interviewer']
async function rest(path:string,auth:any){return fetch(SUPABASE_URL+'/rest/v1/'+path,{headers:supabaseHeaders(auth),cache:'no-store'})}
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401});const{id}=await params;const enc=encodeURIComponent(id)
  const [e,d,ev,forms,invest,parties]=await Promise.all([rest('employee_records?select=*&id=eq.'+enc+'&limit=1',auth),rest('employee_documents?select=*&employee_id=eq.'+enc+'&order=created_at.desc',auth),rest('employee_evaluations?select=*&employee_id=eq.'+enc+'&order=created_at.desc',auth),rest('hr_form_records?select=*&employee_id=eq.'+enc+'&order=created_at.desc',auth),rest('administrative_investigations?select=*&employee_id=eq.'+enc+'&order=created_at.desc',auth),rest('administrative_investigation_parties?select=*&employee_id=eq.'+enc+'&order=created_at.desc',auth)])
  if(!e.ok)return NextResponse.json({error:await e.text()},{status:500});const employee=(await e.json())[0];if(!employee)return NextResponse.json({error:'لم يتم العثور على الموظف'},{status:404})
  let job:any=null;if(employee.job_description_id){const jr=await rest('job_descriptions?select=*&id=eq.'+encodeURIComponent(employee.job_description_id)+'&limit=1',auth);if(jr.ok)job=(await jr.json())[0]||null}
  let partyRows=parties.ok?await parties.json():[];let direct=invest.ok?await invest.json():[]
  if(partyRows.length){const ids=partyRows.map((x:any)=>x.investigation_id).filter(Boolean);const unique=[...new Set(ids)];if(unique.length){const ir=await rest('administrative_investigations?select=*&id=in.('+unique.map((x:string)=>'"'+x+'"').join(',')+')',auth);if(ir.ok){const extra=await ir.json();const seen=new Set(direct.map((x:any)=>x.id));direct=[...direct,...extra.filter((x:any)=>!seen.has(x.id))]}}}
  return NextResponse.json({employee,job_description:job,documents:d.ok?await d.json():[],evaluations:ev.ok?await ev.json():[],forms:forms.ok?await forms.json():[],investigations:direct,investigation_parties:partyRows},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل الملف الشامل'},{status:500})}
}