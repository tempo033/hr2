import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseAdminHeaders } from '@/lib/server-auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const TENANT_SLUG = 'al-bunya-al-asasiya'

async function rest(path: string, headers: Record<string,string>, init: RequestInit = {}) {
  return fetch('${SUPABASE_URL}' + path, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
    cache: 'no-store',
  })
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ['admin'])
    if (!auth) return NextResponse.json({ error: 'لا تملك صلاحية إدارة وصول المستخدمين.' }, { status: 403 })
    const headers = supabaseAdminHeaders(auth)

    const tenantRes = await rest('/rest/v1/tenants?select=id,name,slug&slug=eq.' + TENANT_SLUG + '&limit=1', headers)
    if (!tenantRes.ok) return NextResponse.json({ error: await tenantRes.text() }, { status: 500 })
    const tenants = await tenantRes.json()
    const tenant = tenants[0]
    if (!tenant) return NextResponse.json({ error: 'لم يتم العثور على العميل الأساسي.' }, { status: 404 })

    const [usersRes, branchesRes, tenantUsersRes, assignmentsRes] = await Promise.all([
      rest('/rest/v1/app_users?select=user_id,display_name,role,is_active&order=created_at.desc', headers),
      rest('/rest/v1/branches?select=id,name,unified_number,code,is_active&tenant_id=eq.' + tenant.id + '&order=name.asc', headers),
      rest('/rest/v1/tenant_users?select=id,user_id,role,is_active&tenant_id=eq.' + tenant.id, headers),
      rest('/rest/v1/tenant_user_branches?select=tenant_user_id,branch_id', headers),
    ])

    for (const response of [usersRes, branchesRes, tenantUsersRes, assignmentsRes]) {
      if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: 500 })
    }

    const [users, branches, tenantUsers, assignments] = await Promise.all([
      usersRes.json(), branchesRes.json(), tenantUsersRes.json(), assignmentsRes.json(),
    ])

    const tenantUserByUserId = new Map(tenantUsers.map((u: any) => [u.user_id, u]))
    const branchIdsByTenantUser = new Map<string, string[]>()
    for (const row of assignments) {
      const current = branchIdsByTenantUser.get(row.tenant_user_id) || []
      current.push(row.branch_id)
      branchIdsByTenantUser.set(row.tenant_user_id, current)
    }

    return NextResponse.json({
      tenant,
      branches,
      users: users.map((u: any) => {
        const tu = tenantUserByUserId.get(u.user_id)
        return {
          ...u,
          tenant_user_id: tu?.id || null,
          branch_ids: tu ? (branchIdsByTenantUser.get(tu.id) || []) : [],
          tenant_active: tu?.is_active ?? false,
        }
      }),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ['admin'])
    if (!auth) return NextResponse.json({ error: 'لا تملك صلاحية تعديل وصول المستخدمين.' }, { status: 403 })

    const body = await req.json()
    const userId = String(body.user_id || '').trim()
    const branchIds = Array.isArray(body.branch_ids) ? [...new Set(body.branch_ids.map((v: unknown) => String(v).trim()).filter(Boolean))] : []
    if (!userId) return NextResponse.json({ error: 'معرف المستخدم مطلوب.' }, { status: 400 })

    const headers = supabaseAdminHeaders(auth)
    const tenantRes = await rest('/rest/v1/tenants?select=id&slug=eq.' + TENANT_SLUG + '&limit=1', headers)
    if (!tenantRes.ok) return NextResponse.json({ error: await tenantRes.text() }, { status: 500 })
    const tenant = (await tenantRes.json())[0]
    if (!tenant) return NextResponse.json({ error: 'العميل غير موجود.' }, { status: 404 })

    const userRes = await rest('/rest/v1/tenant_users?select=id,role&tenant_id=eq.' + tenant.id + '&user_id=eq.' + userId + '&limit=1', headers)
    if (!userRes.ok) return NextResponse.json({ error: await userRes.text() }, { status: 500 })
    const tenantUser = (await userRes.json())[0]
    if (!tenantUser) return NextResponse.json({ error: 'المستخدم غير مرتبط بهذا العميل.' }, { status: 404 })

    if (tenantUser.role === 'admin') {
      return NextResponse.json({ ok: true, branch_ids: [], message: 'مدير النظام لديه وصول كامل للعميل ولا يحتاج إلى تعيين فروع.' })
    }

    if (branchIds.length) {
      const branchRes = await rest('/rest/v1/branches?select=id&tenant_id=eq.' + tenant.id + '&id=in.(' + branchIds.join(',') + ')&is_active=eq.true', headers)
      if (!branchRes.ok) return NextResponse.json({ error: await branchRes.text() }, { status: 500 })
      const validIds = new Set((await branchRes.json()).map((b: any) => b.id))
      const invalid = branchIds.filter((id: string) => !validIds.has(id))
      if (invalid.length) return NextResponse.json({ error: 'تم إرسال فرع غير تابع للعميل الحالي.' }, { status: 400 })
    }

    const deleteRes = await rest('/rest/v1/tenant_user_branches?tenant_user_id=eq.' + tenantUser.id, headers, { method: 'DELETE' })
    if (!deleteRes.ok) return NextResponse.json({ error: await deleteRes.text() }, { status: 500 })

    if (branchIds.length) {
      const insertRes = await rest('/rest/v1/tenant_user_branches', headers, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(branchIds.map((branch_id: string) => ({ tenant_user_id: tenantUser.id, branch_id }))),
      })
      if (!insertRes.ok) return NextResponse.json({ error: await insertRes.text() }, { status: 500 })
    }

    return NextResponse.json({ ok: true, branch_ids: branchIds })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.' }, { status: 500 })
  }
}
