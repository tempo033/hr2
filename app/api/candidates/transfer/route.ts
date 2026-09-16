import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'hr2_access_token'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function POST(req: NextRequest) {
  try {
    if (!SERVICE_KEY) return NextResponse.json({ error: 'إعدادات الخادم غير مكتملة.' }, { status: 500 })
    const token = req.cookies.get(COOKIE)?.value
    if (!token) return NextResponse.json({ error: 'جلسة الدخول غير صالحة.' }, { status: 401 })

    const auth = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: PUBLIC_KEY || SERVICE_KEY, Authorization: `Bearer ${token}` },
      cache: 'no-store'
    })
    if (!auth.ok) return NextResponse.json({ error: 'جلسة الدخول غير صالحة.' }, { status: 401 })
    const user = await auth.json()

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${user.id}&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store'
    })
    const profileRows = profileRes.ok ? await profileRes.json() : []
    const profile = profileRows[0]
    const allowed = user.email?.toLowerCase() === 'hr@albenyah.sa' || (profile?.is_active === true && ['admin','hr'].includes(profile.role))
    if (!allowed) return NextResponse.json({ error: 'ليس لديك صلاحية نقل المرشح.' }, { status: 403 })

    const body = await req.json()
    const candidateId = String(body?.candidateId || '')
    const targetRequestId = String(body?.targetRequestId || '')
    if (!candidateId || !targetRequestId) return NextResponse.json({ error: 'بيانات النقل غير مكتملة.' }, { status: 400 })

    const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
    const currentRes = await fetch(`${SUPABASE_URL}/rest/v1/candidates?select=id,request_id,full_name& id=eq.${candidateId}`.replace('?select=id,request_id,full_name& id=', '?select=id,request_id,full_name&id='), { headers, cache: 'no-store' })
    if (!currentRes.ok) return NextResponse.json({ error: 'تعذر قراءة بيانات المرشح.' }, { status: 500 })
    const currentRows = await currentRes.json()
    const current = currentRows[0]
    if (!current) return NextResponse.json({ error: 'المرشح غير موجود.' }, { status: 404 })
    if (current.request_id === targetRequestId) return NextResponse.json({ ok: true, unchanged: true, candidate: current })

    const requestRes = await fetch(`${SUPABASE_URL}/rest/v1/requests?select=id,company_name,exact_type&id=eq.${targetRequestId}`, { headers, cache: 'no-store' })
    const requestRows = requestRes.ok ? await requestRes.json() : []
    if (!requestRows[0]) return NextResponse.json({ error: 'الطلب المستهدف غير موجود.' }, { status: 404 })
    if (requestRows[0].company_name !== 'البنية الاساسية للمقاولات') return NextResponse.json({ error: 'لا يمكن نقل المرشح إلى هذا الطلب.' }, { status: 400 })

    const now = new Date().toISOString()
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/candidates?id=eq.${candidateId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ previous_request_id: current.request_id, moved_at: now, request_id: targetRequestId, status: 'جديد', updated_at: now }), cache: 'no-store'
    })
    if (!updateRes.ok) return NextResponse.json({ error: 'تعذر حفظ نقل المرشح.' }, { status: 500 })
    const updatedRows = await updateRes.json()
    if (!updatedRows?.[0] || updatedRows[0].request_id !== targetRequestId) return NextResponse.json({ error: 'لم يتم تأكيد نقل المرشح.' }, { status: 500 })

    await fetch(`${SUPABASE_URL}/rest/v1/candidate_requirement_scores?candidate_id=eq.${candidateId}`, { method: 'DELETE', headers, cache: 'no-store' })
    return NextResponse.json({ ok: true, candidate: updatedRows[0], target: requestRows[0] })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'حدث خطأ أثناء نقل المرشح.' }, { status: 500 })
  }
}
