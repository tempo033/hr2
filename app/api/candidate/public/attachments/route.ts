import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { SUPABASE_URL } from '@/lib/server-auth'

const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const allowed = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
])

function adminHeaders(extra: Record<string,string> = {}) {
  const key = SERVICE_KEY || PUBLIC_KEY
  return {
    apikey: key,
    ...(SERVICE_KEY && SERVICE_KEY.split('.').length === 3 ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}),
    Accept: 'application/json',
    ...extra,
  }
}

async function resolveCandidate(token: string) {
  if (!token) return null
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/candidates?share_token=eq.${encodeURIComponent(token)}&select=id,share_token&limit=1`,
    { headers: adminHeaders(), cache: 'no-store' }
  )
  const rows = await r.json().catch(() => [])
  return r.ok ? rows?.[0] || null : null
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || ''
  const candidate = await resolveCandidate(token)
  if (!candidate) return NextResponse.json({ error: 'رابط المرشح غير صحيح أو غير متاح.' }, { status: 404 })

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/candidate_attachments?candidate_id=eq.${candidate.id}&select=id,file_name,mime_type,file_size,created_at&order=created_at.desc`,
    { headers: adminHeaders(), cache: 'no-store' }
  )
  const data = await r.json().catch(() => [])
  if (!r.ok) return NextResponse.json({ error: 'تعذر تحميل المرفقات.' }, { status: 500 })
  return NextResponse.json({ attachments: data || [] })
}

export async function POST(req: NextRequest) {
  if (!SERVICE_KEY) return NextResponse.json({ error: 'خدمة المرفقات غير مهيأة.' }, { status: 500 })
  const form = await req.formData()
  const token = String(form.get('token') || '')
  const candidate = await resolveCandidate(token)
  if (!candidate) return NextResponse.json({ error: 'رابط المرشح غير صحيح أو غير متاح.' }, { status: 404 })

  const entries = form.getAll('files').filter((x): x is File => x instanceof File && x.size > 0)
  if (!entries.length) return NextResponse.json({ error: 'اختر ملفًا واحدًا على الأقل.' }, { status: 400 })
  if (entries.length > 5) return NextResponse.json({ error: 'يمكن رفع 5 ملفات كحد أقصى.' }, { status: 400 })

  const uploaded: any[] = []
  try {
    for (const file of entries) {
      if (file.size > 10 * 1024 * 1024) throw new Error(`الملف "${file.name}" أكبر من 10 ميجابايت.`)
      if (!allowed.has(file.type)) throw new Error(`نوع الملف "${file.name}" غير مدعوم. المسموح PDF وWord والصور.`)
      const safeName = file.name.replace(/[^a-zA-Z0-9._-\u0600-\u06FF]/g, '_').slice(0, 120)
      const path = `${candidate.id}/${crypto.randomUUID()}-${safeName}`
      const bytes = new Uint8Array(await file.arrayBuffer())
      const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/candidate-attachments/${encodeURIComponent(path)}`, {
        method: 'POST',
        headers: {
          ...adminHeaders({ 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }),
        },
        body: bytes,
      })
      if (!upload.ok) {
        const detail = await upload.text().catch(() => '')
        throw new Error(detail || `تعذر رفع الملف "${file.name}".`)
      }

      const insert = await fetch(`${SUPABASE_URL}/rest/v1/candidate_attachments`, {
        method: 'POST',
        headers: adminHeaders({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
        body: JSON.stringify({
          candidate_id: candidate.id,
          file_name: file.name,
          storage_path: path,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
        }),
      })
      if (!insert.ok) {
        await fetch(`${SUPABASE_URL}/storage/v1/object/candidate-attachments/${encodeURIComponent(path)}`, {
          method: 'DELETE',
          headers: adminHeaders(),
        }).catch(() => null)
        throw new Error('تعذر حفظ بيانات المرفق.')
      }
      const row = (await insert.json().catch(() => []))?.[0]
      uploaded.push({ id: row?.id, file_name: file.name, mime_type: file.type, file_size: file.size })
    }
    return NextResponse.json({ ok: true, attachments: uploaded })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'تعذر رفع المرفقات.' }, { status: 400 })
  }
}
