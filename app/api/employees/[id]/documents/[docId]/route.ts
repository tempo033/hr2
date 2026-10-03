import {NextRequest,NextResponse} from 'next/server'
import {getServerAuth} from '@/lib/server-auth'
const ROLES=['admin','hr','interviewer','manager'];const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'';const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||''
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string;docId:string}>}){
 const auth=await getServerAuth(req,ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401})
 if(!KEY)return NextResponse.json({error:'خدمة المستندات غير مهيأة.'},{status:500})
 const {id,docId}=await params
 const r=await fetch(`${URL}/rest/v1/employee_documents?select=document_url&employee_id=eq.${encodeURIComponent(id)}&id=eq.${encodeURIComponent(docId)}&limit=1`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}})
 const rows=await r.json().catch(()=>[]);if(!r.ok||!rows[0]?.document_url)return NextResponse.json({error:'المستند غير موجود.'},{status:404})
 const s=await fetch(`${URL}/storage/v1/object/sign/employee-documents/${encodeURIComponent(rows[0].document_url)}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})})
 const data=await s.json().catch(()=>null);if(!s.ok)return NextResponse.json({error:'تعذر إنشاء رابط المستند.'},{status:500})
 return NextResponse.json({url:data?.signedURL||data?.signedUrl||null})
}
