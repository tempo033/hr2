import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth,supabaseHeaders} from '@/lib/server-auth'
const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr','interviewer','manager']
const FIELDS=['employee_number','full_name','nationality','national_id','phone','email','date_of_birth','marital_status','degree','specialization','job_title','department','project_name','work_location','manager_name','hire_date','contract_type','salary','employment_status','residency_status','basic_salary','housing_allowance','transportation_allowance','other_allowances','total_salary_with_allowances','notes','job_description_id']
function norm(v:any){return String(v??'').trim().toLowerCase().replace(/[إأآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ـ/g,'').replace(/\s+/g,' ')}
function clean(v:any){if(v===undefined||v===null)return null;const s=String(v).trim();return s||null}
function money(v:any){if(v===undefined||v===null||v==='')return null;const n=Number(String(v).replace(/,/g,''));return Number.isFinite(n)?n:null}
function dateValue(v:any){if(v===undefined||v===null||v==='')return null;if(v instanceof Date&&!isNaN(v.getTime()))return v.toISOString().slice(0,10);const s=String(v).trim();if(!s)return null;let m=s.match(/^(\\d{4})[-\\/](\\d{1,2})[-\\/](\\d{1,2})$/);if(m){const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));if(d.getFullYear()===Number(m[1])&&d.getMonth()===Number(m[2])-1&&d.getDate()===Number(m[3]))return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0')}m=s.match(/^(\\d{1,2})[-\\/](\\d{1,2})[-\\/](\\d{4})$/);if(m){const d=new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));if(d.getFullYear()===Number(m[3])&&d.getMonth()===Number(m[2])-1&&d.getDate()===Number(m[1]))return m[3]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[1]).padStart(2,'0')}return null}
async function rest(path:string,auth:any,init?:RequestInit){return fetch(SUPABASE_URL+'/rest/v1/'+path,{...init,headers:{...supabaseHeaders(auth),...(init?.headers||{})},cache:'no-store'})}
export async function POST(req:NextRequest){
 try{
  const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const body=await req.json();const rows=Array.isArray(body.rows)?body.rows:[]
  if(!rows.length)return NextResponse.json({error:'لا توجد بيانات للاستيراد'},{status:400})
  const currentRes=await rest('employee_records?select=*',auth);if(!currentRes.ok)return NextResponse.json({error:await currentRes.text()},{status:500})
  const current:any[]=await currentRes.json()
  const byNo=new Map(current.filter(x=>x.employee_number).map(x=>[norm(x.employee_number),x]));const byNational=new Map(current.filter(x=>x.national_id).map(x=>[norm(x.national_id),x]));const byPhone=new Map(current.filter(x=>x.phone).map(x=>[norm(x.phone),x]));const byName=new Map<string,any[]>();
  current.forEach(x=>{const k=norm(x.full_name);if(k){const a=byName.get(k)||[];a.push(x);byName.set(k,a)}})
  let max=1000;current.forEach(x=>{const m=String(x.employee_number||'').match(/^EMP-(\d+)$/i);if(m)max=Math.max(max,Number(m[1]))})
  const used=new Set(current.map(x=>norm(x.employee_number)).filter(Boolean));const seen=new Set<string>();const result:any={created:[],updated:[],unchanged:[],ambiguous:[]}
  for(const raw of rows){
   const input:any={};for(const f of FIELDS)if(Object.prototype.hasOwnProperty.call(raw,f))input[f]=raw[f];input.full_name=clean(input.full_name);if(!input.full_name)continue
   for(const f of ['employee_number','national_id','phone','email','marital_status','degree','specialization','job_title','department','project_name','work_location','manager_name','contract_type','salary','employment_status','residency_status','notes'])if(f in input)input[f]=clean(input[f]);for(const f of ['date_of_birth','hire_date'])if(f in input)input[f]=dateValue(input[f])
   for(const f of ['basic_salary','housing_allowance','transportation_allowance','other_allowances','total_salary_with_allowances'])if(f in input)input[f]=money(input[f])
   let existing:any=null;if(input.employee_number)existing=byNo.get(norm(input.employee_number))||null;if(!existing&&input.national_id)existing=byNational.get(norm(input.national_id))||null;if(!existing&&input.phone)existing=byPhone.get(norm(input.phone))||null
   if(!existing){const matches=byName.get(norm(input.full_name))||[];if(matches.length===1)existing=matches[0];else if(matches.length>1){result.ambiguous.push({full_name:input.full_name,reason:'يوجد أكثر من موظف بنفس الاسم'});continue}}
   if(existing){
    const patch:any={};for(const f of FIELDS)if(Object.prototype.hasOwnProperty.call(input,f)&&input[f]!==null&&input[f]!==''&&String(input[f])!==String(existing[f]??''))patch[f]=input[f]
    if(!Object.keys(patch).length){result.unchanged.push({id:existing.id,full_name:existing.full_name});continue}
    const r=await rest('employee_records?id=eq.'+encodeURIComponent(existing.id),auth,{method:'PATCH',headers:{Prefer:'return=representation','Content-Type':'application/json'},body:JSON.stringify(patch)});if(!r.ok)return NextResponse.json({error:await r.text(),failedEmployee:existing.full_name},{status:500});result.updated.push((await r.json())[0])
   }else{
    let no=clean(input.employee_number);if(!no){do{max++;no='EMP-'+String(max).padStart(4,'0')}while(used.has(norm(no)))}const key=norm(no);if(seen.has(key)||used.has(key)){result.ambiguous.push({full_name:input.full_name,reason:'الرقم الوظيفي '+no+' مكرر'});continue};seen.add(key);used.add(key)
    const payload:any={};for(const f of FIELDS)if(input[f]!==undefined&&input[f]!==null&&input[f]!=='')payload[f]=input[f];payload.employee_number=no
    const r=await rest('employee_records',{method:'POST',headers:{Prefer:'return=representation','Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok)return NextResponse.json({error:await r.text(),failedEmployee:input.full_name},{status:500});result.created.push((await r.json())[0])
   }
  }
  return NextResponse.json({ok:true,...result,summary:{created:result.created.length,updated:result.updated.length,unchanged:result.unchanged.length,ambiguous:result.ambiguous.length}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر استيراد الموظفين'},{status:500})}
}
export async function DELETE(req:NextRequest){
 try{const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401});const body=await req.json().catch(()=>({}));const ids=Array.isArray(body.ids)?body.ids.filter(Boolean):[];if(!ids.length&&!body.all)return NextResponse.json({error:'حدد موظفًا واحدًا على الأقل'},{status:400});const filter=body.all?'id=not.is.null':'id=in.('+ids.map((id:string)=>'"'+id.replace(/"/g,'')+'"').join(',')+')';const r=await rest('employee_records?'+filter,auth,{method:'DELETE',headers:{Prefer:'return=representation'}});if(!r.ok)return NextResponse.json({error:await r.text()},{status:500});return NextResponse.json({ok:true,deleted:(await r.json()).length})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر حذف الموظفين'},{status:500})}
}