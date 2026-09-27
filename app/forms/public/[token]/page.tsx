import {headers} from 'next/headers'
import RequestForm from '@/app/forms/shared/RequestForm'
import ClearancePublic from '@/app/forms/clearance/ClearancePublic'
import AdvanceApprovalPublic from '@/app/forms/advance/AdvanceApprovalPublic'
import AdvanceEmployeePublic from '@/app/forms/advance/AdvanceEmployeePublic'
import LeaveEmployeePublic from '@/app/forms/leave/LeaveEmployeePublic'
import LeaveApprovalPublic from '@/app/forms/leave/LeaveApprovalPublic'

export const dynamic = 'force-dynamic'

export default async function PublicFormPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params
  const h=await headers()
  const host=h.get('x-forwarded-host')||h.get('host')
  const proto=h.get('x-forwarded-proto')||'https'
  if(!host){
    return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 p-6">تعذر تحديد رابط النموذج.</main>
  }

  let data:any=null
  try{
    const r=await fetch(proto+'://'+host+'/api/forms/public/'+encodeURIComponent(token),{cache:'no-store'})
    data=await r.json().catch(()=>null)
    if(!r.ok||!data?.link){
      return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="bg-white border rounded-2xl p-8 text-center"><h1 className="font-black text-xl text-red-700">تعذر فتح النموذج</h1><p className="text-slate-500 mt-2">{data?.error||'الرابط غير صالح أو تم تعطيله.'}</p></div></main>
    }
  }catch{
    return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="bg-white border rounded-2xl p-8 text-center"><h1 className="font-black text-xl text-red-700">تعذر فتح النموذج</h1><p className="text-slate-500 mt-2">تعذر الاتصال بخدمة النموذج. يرجى المحاولة مرة أخرى.</p></div></main>
  }

  const kind=data.link.form_type
  const scope=data.link.link_scope||''
  if(kind==='clearance'&&scope.startsWith('clearance:')){
    return <ClearancePublic token={token} initialData={data}/>
  }
  if(kind==='advance'&&(scope===''||scope==='advance:employee'))return <AdvanceEmployeePublic token={token}/>
  if(kind==='leave'&&scope==='leave:employee')return <LeaveEmployeePublic token={token}/>
  if(kind==='leave'&&scope.startsWith('leave:'))return <LeaveApprovalPublic token={token}/>
  if(kind==='advance'&&scope.startsWith('advance:'))return <AdvanceApprovalPublic token={token}/>
  return <RequestForm kind={kind} publicToken={token}/>
}
