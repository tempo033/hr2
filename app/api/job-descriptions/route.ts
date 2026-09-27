import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth,supabaseHeaders} from '@/lib/server-auth'

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr','manager','interviewer']

function cleanList(v:any){return Array.isArray(v)?v.map(x=>String(x??'').trim()).filter(Boolean):String(v??'').split('\n').map(x=>x.trim()).filter(Boolean)}

export async function GET(req:NextRequest){
 try{
  const auth=await getServerAuth(req,ROLES); if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const h=supabaseHeaders(auth)
  const r=await fetch(`${SUPABASE_URL}/rest/v1/job_descriptions?select=*&order=job_level.asc,sort_order.asc,name.asc`,{headers:h,cache:'no-store'})
  if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
  const rows=await r.json(); const jobs=rows.map((j:any)=>{let k=j.kpi; if(typeof k==='string'){try{k=JSON.parse(k)}catch{}}; if(!Array.isArray(k)&&k&&typeof k==='object') k=Object.values(k); return {...j,kpi:Array.isArray(k)?k.map((x:any)=>String(x??'').trim()).filter(Boolean):[]}}); return NextResponse.json({jobs},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل الأوصاف الوظيفية'},{status:500})}
}

export async function POST(req:NextRequest){
 try{
  const auth=await getServerAuth(req,ROLES); if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const b=await req.json()
  if(!String(b.name||'').trim()||!String(b.department||'').trim())return NextResponse.json({error:'المسمى الوظيفي والقسم مطلوبان'},{status:400})
  const payload={name:String(b.name).trim(),department:String(b.department).trim(),manager:String(b.manager||'').trim()||null,purpose:String(b.purpose||'').trim()||null,job_level:Number(b.job_level||4),job_family:String(b.job_family||b.department||'').trim()||null,sort_order:Number(b.sort_order||400),direct_reports:cleanList(b.direct_reports),responsibilities:cleanList(b.responsibilities),routine:cleanList(b.routine),authorities:cleanList(b.authorities),qualifications:cleanList(b.qualifications),experience:cleanList(b.experience),skills:cleanList(b.skills),kpi:cleanList(b.kpi),compliance:cleanList(b.compliance),updated_at:new Date().toISOString()}
  const r=await fetch(`${SUPABASE_URL}/rest/v1/job_descriptions`,{method:'POST',headers:supabaseHeaders(auth,{'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(payload)})
  if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
  return NextResponse.json({job:(await r.json())[0]})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر إضافة الوصف الوظيفي'},{status:500})}
}

export async function PATCH(req:NextRequest){
 try{
  const auth=await getServerAuth(req,ROLES); if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const b=await req.json(); if(!b.id)return NextResponse.json({error:'معرف الوظيفة مطلوب'},{status:400})
  const payload={name:String(b.name||'').trim(),department:String(b.department||'').trim(),manager:String(b.manager||'').trim()||null,purpose:String(b.purpose||'').trim()||null,job_level:Number(b.job_level||4),job_family:String(b.job_family||b.department||'').trim()||null,sort_order:Number(b.sort_order||400),direct_reports:cleanList(b.direct_reports),responsibilities:cleanList(b.responsibilities),routine:cleanList(b.routine),authorities:cleanList(b.authorities),qualifications:cleanList(b.qualifications),experience:cleanList(b.experience),skills:cleanList(b.skills),kpi:cleanList(b.kpi),compliance:cleanList(b.compliance),updated_at:new Date().toISOString()}
  const r=await fetch(`${SUPABASE_URL}/rest/v1/job_descriptions?id=eq.${encodeURIComponent(b.id)}`,{method:'PATCH',headers:supabaseHeaders(auth,{'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(payload)})
  if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
  return NextResponse.json({job:(await r.json())[0]})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تعديل الوصف الوظيفي'},{status:500})}
}

export async function DELETE(req:NextRequest){
 try{
  const auth=await getServerAuth(req,ROLES); if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
  const id=new URL(req.url).searchParams.get('id'); if(!id)return NextResponse.json({error:'معرف الوظيفة مطلوب'},{status:400})
  const r=await fetch(`${SUPABASE_URL}/rest/v1/job_descriptions?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:supabaseHeaders(auth)})
  if(!r.ok)return NextResponse.json({error:await r.text()},{status:500})
  return NextResponse.json({ok:true})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر حذف الوصف الوظيفي'},{status:500})}
}
