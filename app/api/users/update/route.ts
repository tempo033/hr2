import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseAdminHeaders } from '@/lib/server-auth'

const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://pdkdvaisggntdrvpxuur.supabase.co'
const BOOTSTRAP_EMAIL='hr@albenyah.sa'
const TENANT_SLUG='al-bunya-al-asasiya'
const ROLES=new Set(['admin','hr','interviewer','manager','finance','project_manager','general_manager'])

export async function PATCH(req:NextRequest){
  try{
    const auth=await getServerAuth(req,['admin'])
    if(!auth)return NextResponse.json({error:'لا تملك صلاحية تعديل المستخدمين.'},{status:403})
    const body=await req.json()
    if(!body.user_id)return NextResponse.json({error:'معرف المستخدم مطلوب.'},{status:400})
    if(body.role!==undefined&&!ROLES.has(body.role))return NextResponse.json({error:'الصلاحية المحددة غير صحيحة.'},{status:400})
    if(body.is_active!==undefined&&typeof body.is_active!=='boolean')return NextResponse.json({error:'حالة المستخدم غير صحيحة.'},{status:400})
    if(body.role===undefined&&body.is_active===undefined)return NextResponse.json({error:'لا توجد تغييرات.'},{status:400})
    if(body.user_id===auth.user.id&&body.is_active===false)return NextResponse.json({error:'لا يمكن إيقاف حسابك الحالي.'},{status:400})
    if(body.user_id===auth.user.id&&body.role&&body.role!=='admin')return NextResponse.json({error:'لا يمكن إزالة صلاحية مدير النظام من حسابك الحالي.'},{status:400})

    const headers=supabaseAdminHeaders(auth)
    const payload:any={}
    if(body.role!==undefined)payload.role=body.role
    if(body.is_active!==undefined)payload.is_active=body.is_active

    const update=await fetch(SUPABASE_URL+'/rest/v1/app_users?user_id=eq.'+encodeURIComponent(body.user_id),{
      method:'PATCH',headers:{...headers,Prefer:'return=representation'},body:JSON.stringify(payload),cache:'no-store'
    })
    if(!update.ok){
      const text=await update.text()
      return NextResponse.json({error:text||'تعذر تحديث المستخدم.'},{status:500})
    }
    const rows=await update.json()
    if(!rows?.length)return NextResponse.json({error:'المستخدم غير موجود في ملف الصلاحيات.'},{status:404})

    const tenantRes=await fetch(SUPABASE_URL+'/rest/v1/tenants?select=id&slug=eq.'+TENANT_SLUG+'&limit=1',{headers,cache:'no-store'})
    if(!tenantRes.ok)return NextResponse.json({error:'تعذر الوصول إلى بيانات العميل.'},{status:500})
    const tenants=await tenantRes.json(),tenantId=tenants?.[0]?.id
    if(!tenantId)return NextResponse.json({error:'العميل الحالي غير موجود.'},{status:404})

    const tenantUpdate=await fetch(SUPABASE_URL+'/rest/v1/tenant_users?tenant_id=eq.'+tenantId+'&user_id=eq.'+encodeURIComponent(body.user_id),{
      method:'PATCH',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify(payload),cache:'no-store'
    })
    if(!tenantUpdate.ok){
      return NextResponse.json({error:'تم تحديث المستخدم الأساسي لكن تعذر مزامنة صلاحية العميل.'},{status:500})
    }

    if(body.is_active===false&&auth.serviceKey){
      const target=await fetch(SUPABASE_URL+'/auth/v1/admin/users/'+encodeURIComponent(body.user_id),{
        headers:{apikey:auth.serviceKey,Authorization:'Bearer '+auth.serviceKey},cache:'no-store'
      })
      if(!target.ok)return NextResponse.json({error:'تعذر العثور على المستخدم.'},{status:404})
      const t=await target.json()
      if(t.email?.toLowerCase()===BOOTSTRAP_EMAIL)return NextResponse.json({error:'حساب الإدارة الأساسي لا يمكن إيقافه.'},{status:400})
    }

    return NextResponse.json({user:rows[0]})
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:'حدث خطأ غير متوقع.'},{status:500})
  }
}
