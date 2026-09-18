import { NextRequest, NextResponse } from 'next/server'
import { SUPABASE_URL, PUBLIC_KEY } from '@/lib/server-auth'
const DB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || PUBLIC_KEY

function clientMeta(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ip = forwarded.split(',')[0]?.trim() || null
  const ua = req.headers.get('user-agent') || null
  const platform = req.headers.get('sec-ch-ua-platform')?.replace(/^"|"$/g, '') || ''
  const model = req.headers.get('sec-ch-ua-model')?.replace(/^"|"$/g, '') || ''
  const mobile = req.headers.get('sec-ch-ua-mobile') === '?1'
  const device = [platform, model, mobile ? 'Mobile' : 'Desktop'].filter(Boolean).join(' / ') || ua || 'غير معروف'
  return { ip, ua, device }
}

async function db(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: DB_KEY,
      Authorization: `Bearer ${DB_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const linkRes = await db(`hr_form_links?select=*&token=eq.${encodeURIComponent(token)}&status=eq.active&limit=1`)
  const links = await linkRes.json()
  const link = links?.[0]
  if (!link) return NextResponse.json({ error: 'الرابط غير صالح أو تم تعطيله.' }, { status: 404 })
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'انتهت صلاحية الرابط.' }, { status: 410 })
  }

  const meta = clientMeta(req)
  await db('hr_form_links?token=eq.' + encodeURIComponent(token), {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      last_opened_at: new Date().toISOString(),
      last_ip_address: meta.ip,
      last_device_name: meta.device,
      last_user_agent: meta.ua,
    }),
  })
  await db('hr_form_link_access', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ link_id: link.id, event_type: 'open', ip_address: meta.ip, device_name: meta.device, user_agent: meta.ua }),
  })

  let record = null
  if (link.record_id) {
    const recordRes = await db(`hr_form_records?select=*&id=eq.${encodeURIComponent(link.record_id)}&limit=1`)
    const records = await recordRes.json()
    record = records?.[0] || null
  }
  return NextResponse.json({ link: { id: link.id, token: link.token, form_type: link.form_type, expires_at: link.expires_at }, record })
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params
  const linkRes = await db(`hr_form_links?select=*&token=eq.${encodeURIComponent(token)}&status=eq.active&limit=1`)
  const links = await linkRes.json()
  const link = links?.[0]
  if (!link) return NextResponse.json({ error: 'الرابط غير صالح أو تم تعطيله.' }, { status: 404 })
  if (link.expires_at && new Date(link.expires_at) < new Date()) return NextResponse.json({ error: 'انتهت صلاحية الرابط.' }, { status: 410 })

  const body = await req.json()
  const form = body.form || {}
  const meta = clientMeta(req)
  const base = {
    form_type: link.form_type,
    employee_id: link.employee_id || null,
    employee_number: form.employee_number || null,
    employee_name: form.employee_name || null,
    department: form.department || null,
    job_title: form.job_title || null,
    form_data: form,
    status: 'معبأ عبر رابط خارجي',
    last_ip_address: meta.ip,
    last_device_name: body.device_name || meta.device,
    last_user_agent: meta.ua,
    submitted_via_link: true,
    updated_at: new Date().toISOString(),
  }

  let recordId = link.record_id
  let recordResponse: Response
  if (recordId) {
    recordResponse = await db(`hr_form_records?id=eq.${encodeURIComponent(recordId)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(base),
    })
  } else {
    recordResponse = await db('hr_form_records', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...base, created_at: new Date().toISOString() }),
    })
  }
  const records = await recordResponse.json()
  if (!recordResponse.ok) return NextResponse.json({ error: records?.message || JSON.stringify(records) }, { status: 500 })
  recordId = records?.[0]?.id || recordId

  await db(`hr_form_links?id=eq.${encodeURIComponent(link.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      record_id: recordId,
      last_submitted_at: new Date().toISOString(),
      last_ip_address: meta.ip,
      last_device_name: body.device_name || meta.device,
      last_user_agent: meta.ua,
    }),
  })
  await db('hr_form_link_access', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      link_id: link.id,
      event_type: 'submit',
      ip_address: meta.ip,
      device_name: body.device_name || meta.device,
      user_agent: meta.ua,
    }),
  })
  return NextResponse.json({ ok: true, record_id: recordId })
}
