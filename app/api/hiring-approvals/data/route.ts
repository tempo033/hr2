import {NextRequest,NextResponse} from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr','interviewer','manager']
async function get(path:string,a:any){return fetch(`${URL}/rest/v1/${path}`,{headers:supabaseHeaders(a),cache:'no-store'})}
export async function GET(req:NextRequest){try{const a=await getServerAuth(req,ROLES);if(!a)return NextResponse.json({error:'غير مصرح'},{status:401});const [c,r,ap]=await Promise.all([get('candidates?select=id,request_id,full_name,phone,specialization,status&order=created_at.desc',a),get('requests?select=id,exact_type,request_type',a),get('candidate_hiring_approvals?select=*&order=updated_at.desc',a)]);if(!c.ok||!r.ok||!ap.ok)throw new Error('تعذر تحميل بيانات الاعتماد');return NextResponse.json({candidates:await c.json(),requests:await r.json(),approvals:await ap.json()},{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل الاعتمادات'},{status:500})}}
