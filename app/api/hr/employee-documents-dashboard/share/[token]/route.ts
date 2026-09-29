import { NextRequest, NextResponse } from 'next/server'
import { fetchEmployeeDocumentsDashboardData, serviceRoleHeaders } from '@/lib/employee-documents-dashboard'

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: 'رابط المشاركة غير صالح' }, { status: 404 })

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
    const shareRes = await fetch(
      `${base}/rest/v1/employee_documents_dashboard_shares?select=id,token,expires_at,allow_export,revoked&token=eq.${encodeURIComponent(token)}&limit=1`,
      { headers: serviceRoleHeaders(), cache: 'no-store' },
    )
    if (!shareRes.ok) return NextResponse.json({ error: 'تعذر التحقق من رابط المشاركة' }, { status: 500 })
    const shares = await shareRes.json()
    const share = shares?.[0]
    if (!share || share.revoked || (share.expires_at && new Date(share.expires_at).getTime() <= Date.now())) {
      return NextResponse.json({ error: 'رابط المشاركة غير صالح أو منتهي' }, { status: 404 })
    }

    const data = await fetchEmployeeDocumentsDashboardData(serviceRoleHeaders())
    return NextResponse.json({ ...data, share: { read_only: true, allow_export: share.allow_export === true } }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل لوحة المشاركة' }, { status: 500 })
  }
}
