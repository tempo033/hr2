import {NextRequest,NextResponse} from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const ROLES=['admin','hr','interviewer','manager']
async function get(path:string,a:any){return fetch(`${URL}/rest/v1/${path}`,{headers:supabaseHeaders(a),cache:'no-store'})}
export async function GET(req:NextRequest){try{const a=await getServerAuth(req,ROLES);if(!a)return NextResponse.json({error:'غير مصرح'},{status:401});const[os,cs,rs]=await Promise.all([get('candidate_hiring_approvals?select=*&gm_decision=in.(%D9%82%D8%A8%D9%88%D9%84,%D9%82%D8%A8%D9%88%D9%84%20%D8%A8%D8%B9%D8%B1%D8%B6%20%D9%85%D8%A7%D9%84%D9%8A%20%D9%85%D8%AE%D8%AA%D9%84%D9%81)&order=updated_at.desc',a),get('candidates?select=id,full_name,phone',a),get('requests?select=id,exact_type',a)]);if(!os.ok||!cs.ok||!rs.ok)throw new Error('تعذر تحميل العروض');return NextResponse.json({offers:await os.json(),candidates:await cs.json(),requests:await rs.json()},{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل العروض'},{status:500})}}
