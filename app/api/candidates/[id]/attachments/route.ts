import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth} from '@/lib/server-auth'
const ROLES=['admin','hr','interviewer','manager','interview_viewer'];const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'';const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||''
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 if(!KEY)return NextResponse.json({error:'خدمة المرفقات غير مهيأة.'},{status:500})
 const {id}=await params
 const r=await fetch(`${URL}/rest/v1/candidate_attachments?select=id,file_name,mime_type,file_size,created_at,storage_path&candidate_id=eq.${encodeURIComponent(id)}&order=created_at.desc`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}})
 const rows=await r.json().catch(()=>[]);if(!r.ok)return NextResponse.json({error:'تعذر تحميل المرفقات.'},{status:500})
 const attachments=await Promise.all((rows||[]).map(async(x:any)=>{const s=await fetch(`${URL}/storage/v1/object/sign/candidate-attachments/${encodeURIComponent(x.storage_path)}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});const d=await s.json().catch(()=>null);return {...x,url:d?.signedURL||d?.signedUrl||null}}))
 return NextResponse.json({attachments})
}
