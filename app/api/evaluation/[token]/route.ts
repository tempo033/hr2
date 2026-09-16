import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const h = () => ({ apikey: SERVICE_KEY || '', Authorization: `Bearer ${SERVICE_KEY || ''}`, 'Content-Type': 'application/json' })

async function rest(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...h(), ...(init?.headers || {}) }, cache: 'no-store' })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    if (!SERVICE_KEY) return NextResponse.json({ error: 'إعدادات قاعدة البيانات غير مكتملة' }, { status: 500 })
    const { token } = await params
    const lr = await rest(`candidate_evaluation_links?select=*&token=eq.${encodeURIComponent(token)}&limit=1`)
    if (!lr.ok) return NextResponse.json({ error: await lr.text() }, { status: 500 })
    const links = await lr.json()
    const link = links[0]
    if (!link) return NextResponse.json({ error: 'الرابط غير صالح.' }, { status: 404 })
    const [cr, rr, ir] = await Promise.all([
      rest(`candidates?select=*&id=eq.${link.candidate_id}&limit=1`),
      rest(`requests?select=*&id=eq.${link.request_id}&limit=1`),
      rest(`candidate_interviews?select=*&candidate_id=eq.${link.candidate_id}&order=created_at.desc&limit=1`)
    ])
    const candidates = cr.ok ? await cr.json() : []
    const requests = rr.ok ? await rr.json() : []
    const interviews = ir.ok ? await ir.json() : []
    return NextResponse.json({ link, candidate: candidates[0] || null, request: requests[0] || null, interview: interviews[0] || null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل الرابط' }, { status: 500 }) }
}
