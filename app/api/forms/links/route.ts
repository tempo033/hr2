import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders, SUPABASE_URL } from '@/lib/server-auth'

const allowed = ['admin','hr','interviewer','manager']

export async function GET(req: NextRequest) {
  const auth = await getServerAuth(req, allowed)
  if (!auth) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 })
  const response = await fetch(`${SUPABASE_URL}/rest/v1/hr_form_links?select=*&order=created_at.desc`, { headers: supabaseHeaders(auth), cache: 'no-store' })
  const data = await response.json()
  if (!response.ok) return NextResponse.json({ error: JSON.stringify(data) }, { status: response.status })
  return NextResponse.json({ links: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await getServerAuth(req, allowed)
  if (!auth) return NextResponse.json({ error: 'غير مصرح.' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const formType = body.form_type
  if (!['leave','clearance','advance'].includes(formType)) {
    return NextResponse.json({ error: 'نوع النموذج غير مدعوم.' }, { status: 400 })
  }

  const headers = { ...supabaseHeaders(auth), 'Content-Type': 'application/json', Prefer: 'return=representation' }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/hr_form_links`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      form_type: formType,
      employee_id: body.employee_id || null,
      record_id: body.record_id || null,
      created_by: auth.user.id,
      expires_at: body.expires_at || null,
    }),
  })
  const data = await response.json()
  if (!response.ok) return NextResponse.json({ error: data?.message || JSON.stringify(data) }, { status: response.status })
  return NextResponse.json({ link: data?.[0] || data })
}
