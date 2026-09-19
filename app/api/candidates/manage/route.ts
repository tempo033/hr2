import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const WRITE_ROLES = ['admin', 'hr', 'interviewer', 'manager']
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, WRITE_ROLES)
    if (!auth) {
      return NextResponse.json({ error: 'غير مصرح أو الحساب للقراءة فقط' }, { status: 401 })
    }

    const b = await req.json()
    const headers = () => supabaseHeaders(auth, {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    })

    if (b.action === 'create') {
      if (!b.requestId) {
        return NextResponse.json({ error: 'الطلب الوظيفي مطلوب' }, { status: 400 })
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/candidates`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          request_id: b.requestId,
          full_name: (b.fullName || 'مرشح جديد').trim(),
          phone: (b.phone || '').trim(),
          status: 'جديد',
        }),
      })

      if (!r.ok) {
        return NextResponse.json({ error: await r.text() }, { status: 500 })
      }

      return NextResponse.json({ candidate: (await r.json())[0] })
    }

    if (b.action === 'status') {
      if (!b.candidateId || !b.status) {
        return NextResponse.json({ error: 'بيانات الحالة ناقصة' }, { status: 400 })
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/candidates?id=eq.${b.candidateId}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ status: b.status, updated_at: new Date().toISOString() }),
      })

      if (!r.ok) {
        return NextResponse.json({ error: await r.text() }, { status: 500 })
      }

      return NextResponse.json({ candidate: (await r.json())[0] })
    }

    if (b.action === 'delete') {
      if (!b.candidateId) {
        return NextResponse.json({ error: 'معرف المرشح مطلوب' }, { status: 400 })
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/candidates?id=eq.${b.candidateId}`, {
        method: 'DELETE',
        headers: headers(),
      })

      if (!r.ok) {
        return NextResponse.json({ error: await r.text() }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'عملية غير معروفة' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : 'تعذر تنفيذ العملية',
    }, { status: 500 })
  }
}


export async function GET(req:NextRequest){try{const auth=await getServerAuth(req,WRITE_ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401});const h=supabaseHeaders(auth);const [c,r]=await Promise.all([fetch(`${SUPABASE_URL}/rest/v1/candidates?select=*&order=created_at.desc`,{headers:h,cache:'no-store'}),fetch(`${SUPABASE_URL}/rest/v1/requests?select=id,exact_type,request_type`,{headers:h,cache:'no-store'})]);if(!c.ok||!r.ok)throw new Error('تعذر تحميل المرشحين');return NextResponse.json({candidates:await c.json(),requests:await r.json()},{headers:{'Cache-Control':'no-store'}})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل المرشحين'},{status:500})}}
export async function PATCH(req:NextRequest){try{const auth=await getServerAuth(req,WRITE_ROLES);if(!auth)return NextResponse.json({error:'غير مصرح'},{status:401});const b=await req.json();if(!b.candidateId)return NextResponse.json({error:'معرف المرشح مطلوب'},{status:400});const r=await fetch(`${SUPABASE_URL}/rest/v1/candidates?id=eq.${encodeURIComponent(b.candidateId)}`,{method:'PATCH',headers:supabaseHeaders(auth,{'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify({full_name:String(b.fullName||'').trim(),phone:String(b.phone||'').trim(),email:String(b.email||'').trim(),specialization:String(b.specialization||'').trim(),updated_at:new Date().toISOString()})});if(!r.ok)return NextResponse.json({error:await r.text()},{status:500});return NextResponse.json({candidate:(await r.json())[0]})}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تعديل المرشح'},{status:500})}}