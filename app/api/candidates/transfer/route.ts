import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ['admin','hr'])
    if (!auth) return NextResponse.json({ error: 'ليس لديك صلاحية نقل المرشح.' }, { status: 403 })
    const body = await req.json()
    const candidateId = String(body?.candidateId || ''), targetRequestId = String(body?.targetRequestId || '')
    if (!candidateId || !targetRequestId) return NextResponse.json({ error: 'بيانات النقل غير مكتملة.' }, { status: 400 })
    const headers = { ...supabaseHeaders(auth, { 'Content-Type': 'application/json' }), Prefer: 'return=representation' }
    const currentRes = await fetch(`${SUPABASE_URL}/rest/v1/candidates?select=id,request_id,full_name&id=eq.${candidateId}`, { headers, cache: 'no-store' })
    if (!currentRes.ok) return NextResponse.json({ error: 'تعذر قراءة بيانات المرشح.' }, { status: 500 })
    const current = (await currentRes.json())[0]
    if (!current) return NextResponse.json({ error: 'المرشح غير موجود.' }, { status: 404 })
    if (current.request_id === targetRequestId) return NextResponse.json({ ok: true, unchanged: true, candidate: current })
    const requestRes = await fetch(`${SUPABASE_URL}/rest/v1/requests?select=id,company_name,exact_type&id=eq.${targetRequestId}`, { headers, cache: 'no-store' })
    const request = requestRes.ok ? (await requestRes.json())[0] : null
    if (!request) return NextResponse.json({ error: 'الطلب المستهدف غير موجود.' }, { status: 404 })
    if (request.company_name !== 'البنية الاساسية للمقاولات') return NextResponse.json({ error: 'لا يمكن نقل المرشح إلى هذا الطلب.' }, { status: 400 })
    const now = new Date().toISOString()
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/candidates?id=eq.${candidateId}`, { method: 'PATCH', headers, body: JSON.stringify({ previous_request_id: current.request_id, moved_at: now, request_id: targetRequestId, status: 'جديد', updated_at: now }), cache: 'no-store' })
    if (!updateRes.ok) return NextResponse.json({ error: 'تعذر حفظ نقل المرشح.' }, { status: 500 })
    const updated = (await updateRes.json())[0]
    if (!updated || updated.request_id !== targetRequestId) return NextResponse.json({ error: 'لم يتم تأكيد نقل المرشح.' }, { status: 500 })
    await fetch(`${SUPABASE_URL}/rest/v1/candidate_requirement_scores?candidate_id=eq.${candidateId}`, { method: 'DELETE', headers, cache: 'no-store' })
    return NextResponse.json({ ok: true, candidate: updated, target: request })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'حدث خطأ أثناء نقل المرشح.' }, { status: 500 }) }
}
