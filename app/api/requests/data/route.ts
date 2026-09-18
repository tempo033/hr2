import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const ALLOWED = ['admin','hr','interviewer','manager','interview_viewer']

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ALLOWED)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const headers = supabaseHeaders(auth)
    const [requestsRes, candidatesRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'}/rest/v1/requests?select=id,company_name,request_type,exact_type,notes,status,created_at&order=created_at.desc`, { headers, cache: 'no-store' }),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'}/rest/v1/candidates?select=id,request_id,status&order=created_at.desc`, { headers, cache: 'no-store' }),
    ])
    if (!requestsRes.ok || !candidatesRes.ok) throw new Error('تعذر قراءة بيانات الطلبات')
    return NextResponse.json({ requests: await requestsRes.json(), candidates: await candidatesRes.json() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل البيانات' }, { status: 500 })
  }
}


export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ['admin','hr','interviewer','manager'])
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const body = await req.json()
    const kind = String(body.requestType || '').trim()
    const exactType = String(body.exactType || '').trim()
    const notes = String(body.notes || '')
    const requirements = Array.isArray(body.requirements)
      ? body.requirements.filter((x: any) => String(x?.name || '').trim())
      : []
    const total = requirements.reduce((s: number, x: any) => s + Number(x?.weight || 0), 0)
    if (!kind || !exactType || !requirements.length || Math.abs(total - 100) >= 0.01) {
      return NextResponse.json({ error: 'نوع الطلب والنوع الدقيق والمتطلبات ومجموع الأوزان 100% مطلوبة' }, { status: 400 })
    }
    const headers = supabaseHeaders(auth, { Prefer: 'return=representation', 'Content-Type': 'application/json' })
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
    const create = await fetch(`${base}/rest/v1/requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        company_name: 'البنية الاساسية للمقاولات',
        request_type: kind,
        exact_type: exactType,
        notes,
        status: 'مفتوح',
      }),
    })
    if (!create.ok) return NextResponse.json({ error: await create.text() }, { status: 500 })
    const created = (await create.json())[0]
    const insertRequirements = await fetch(`${base}/rest/v1/request_requirements`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requirements.map((x: any, i: number) => ({
        request_id: created.id,
        name: String(x.name).trim(),
        category: String(x.category || 'عام'),
        weight: Number(x.weight || 0),
        required: Boolean(x.required),
        sort_order: i,
      }))),
    })
    if (!insertRequirements.ok) {
      await fetch(`${base}/rest/v1/requests?id=eq.${encodeURIComponent(created.id)}`, { method: 'DELETE', headers })
      return NextResponse.json({ error: await insertRequirements.text() }, { status: 500 })
    }
    return NextResponse.json({ request: created }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر إنشاء الطلب' }, { status: 500 })
  }
}