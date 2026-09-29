import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const VIEW_ROLES = ['admin','hr','interviewer','manager','finance','general_manager']
const MANAGE_ROLES = ['admin','hr']

async function rest(path:string, auth:any, init?:RequestInit) {
  return fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...supabaseHeaders(auth), ...(init?.headers || {}) },
    cache: 'no-store',
  })
}

function clean(v:any) {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s || null
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, VIEW_ROLES)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const includeInactive = new URL(req.url).searchParams.get('include_inactive') === '1'
    const select = 'id,name,name_en,unified_number,commercial_registration,company_type,parent_company_id,is_active,notes,created_at,updated_at,parent:employee_companies!employee_companies_parent_company_id_fkey(id,name,unified_number)'
    const filter = includeInactive ? '' : '&is_active=eq.true'
    const r = await rest(`employee_companies?select=${select}${filter}&order=is_active.desc,name.asc`, auth)
    if (!r.ok) return NextResponse.json({ error: await r.text() }, { status: 500 })
    return NextResponse.json({ companies: await r.json() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'تعذر تحميل الشركات' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, MANAGE_ROLES)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const body = await req.json()
    const name = clean(body.name)
    const unified_number = clean(body.unified_number)
    if (!name) return NextResponse.json({ error: 'اسم الشركة بالعربي مطلوب.' }, { status: 400 })
    if (!unified_number) return NextResponse.json({ error: 'الرقم الموحد مطلوب.' }, { status: 400 })

    const parent_company_id = clean(body.parent_company_id)
    if (parent_company_id && parent_company_id === body.id) return NextResponse.json({ error: 'لا يمكن أن تكون الشركة رئيسية لنفسها.' }, { status: 400 })

    const payload = {
      name,
      name_en: clean(body.name_en) || '',
      unified_number,
      commercial_registration: clean(body.commercial_registration),
      company_type: clean(body.company_type) || 'شركة',
      parent_company_id: parent_company_id || null,
      is_active: body.is_active !== false,
      notes: clean(body.notes),
    }
    const r = await rest('employee_companies', auth, { method:'POST', headers:{Prefer:'return=representation'}, body:JSON.stringify(payload) })
    if (!r.ok) {
      const t = await r.text()
      if (/duplicate|unique/i.test(t)) return NextResponse.json({ error: 'الرقم الموحد مستخدم بالفعل لشركة أخرى.' }, { status: 409 })
      return NextResponse.json({ error:t }, { status:500 })
    }
    return NextResponse.json({ company:(await r.json())[0] }, { status:201 })
  } catch(e) {
    return NextResponse.json({ error:e instanceof Error?e.message:'تعذر إضافة الشركة' }, { status:500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, MANAGE_ROLES)
    if (!auth) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    const body = await req.json()
    const id = clean(body.id)
    if (!id) return NextResponse.json({ error:'معرف الشركة مطلوب.' }, { status:400 })
    const parent_company_id = clean(body.parent_company_id)
    if (parent_company_id === id) return NextResponse.json({ error:'لا يمكن ربط الشركة بنفسها كشركة رئيسية.' }, { status:400 })

    const payload:any = {}
    for (const key of ['name','name_en','unified_number','commercial_registration','company_type','notes']) {
      if (Object.prototype.hasOwnProperty.call(body,key)) payload[key] = key==='unified_number' ? clean(body[key]) : clean(body[key])
    }
    if (Object.prototype.hasOwnProperty.call(body,'parent_company_id')) payload.parent_company_id = parent_company_id
    if (Object.prototype.hasOwnProperty.call(body,'is_active')) payload.is_active = Boolean(body.is_active)

    if (payload.name === '') return NextResponse.json({error:'اسم الشركة بالعربي مطلوب.'},{status:400})
    if (payload.unified_number === '') return NextResponse.json({error:'الرقم الموحد مطلوب.'},{status:400})

    const r=await rest(`employee_companies?id=eq.${encodeURIComponent(id)}`,auth,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)})
    if(!r.ok){
      const t=await r.text()
      if(/duplicate|unique/i.test(t)) return NextResponse.json({error:'الرقم الموحد مستخدم بالفعل لشركة أخرى.'},{status:409})
      return NextResponse.json({error:t},{status:500})
    }
    const rows=await r.json()
    if(!rows[0]) return NextResponse.json({error:'الشركة غير موجودة.'},{status:404})
    return NextResponse.json({company:rows[0]})
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'تعذر تعديل الشركة'},{status:500})}
}
