'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, ShieldCheck, UserPlus, Users, X, Building2, Save } from 'lucide-react'

type Branch = { id:string; name:string; unified_number?:string|null; code?:string|null; is_active:boolean }
type Profile = {
  user_id:string; display_name:string; email:string; role:string; is_active:boolean; created_at:string
  last_sign_in_at?:string|null; tenant_user_id?:string|null; branch_ids?:string[]
}
const roleLabels:Record<string,string> = {
  admin:'مدير النظام', hr:'الموارد البشرية', interviewer:'مقيم / مقابلات', manager:'مدير',
  finance:'الإدارة المالية', project_manager:'مدير المشاريع', general_manager:'المدير العام'
}

export default function UsersPage() {
  const [profiles,setProfiles]=useState<Profile[]>([])
  const [branches,setBranches]=useState<Branch[]>([])
  const [showModal,setShowModal]=useState(false),[showPassword,setShowPassword]=useState(false)
  const [loading,setLoading]=useState(false),[pageLoading,setPageLoading]=useState(true),[error,setError]=useState(''),[success,setSuccess]=useState('')
  const [savingId,setSavingId]=useState(''),[accessDraft,setAccessDraft]=useState<Record<string,string[]>>({})
  const [form,setForm]=useState({display_name:'',email:'',password:'',role:'hr'})

  async function load() {
    setPageLoading(true); setError('')
    try {
      const [usersRes,accessRes]=await Promise.all([
        fetch('/api/users/list',{cache:'no-store'}),fetch('/api/users/access',{cache:'no-store'})
      ])
      const usersData=await usersRes.json(), accessData=await accessRes.json()
      if(!usersRes.ok) throw new Error(usersData.error||'تعذر تحميل المستخدمين.')
      if(!accessRes.ok) throw new Error(accessData.error||'تعذر تحميل صلاحيات الفروع.')
      const accessUsers=(accessData.users||[]) as Profile[]
      setProfiles(accessUsers)
      setBranches((accessData.branches||[]).filter((b:Branch)=>b.is_active))
      setAccessDraft(Object.fromEntries(accessUsers.map(u=>[u.user_id,u.branch_ids||[]])))
    } catch(e){setError(e instanceof Error?e.message:'تعذر تحميل المستخدمين.')}
    finally{setPageLoading(false)}
  }
  useEffect(()=>{load()},[])

  async function submit(e:FormEvent){
    e.preventDefault();setError('');setSuccess('');setLoading(true)
    try{
      const r=await fetch('/api/users/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
      const d=await r.json();if(!r.ok)throw new Error(d.error||'تعذر إنشاء المستخدم.')
      setSuccess('تم إنشاء المستخدم '+form.display_name+' بنجاح. تم حفظ الصلاحية، ويمكن الآن تحديد الفروع المسموح بها.')
      setForm({display_name:'',email:'',password:'',role:'hr'});setShowModal(false);await load()
    }catch(e){setError(e instanceof Error?e.message:'تعذر إنشاء المستخدم.')}
    finally{setLoading(false)}
  }

  async function updateUser(user_id:string,patch:Partial<Pick<Profile,'role'|'is_active'>>){
    setError('');setSuccess('');setSavingId(user_id)
    try{
      const r=await fetch('/api/users/update',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id,...patch})})
      const d=await r.json();if(!r.ok)throw new Error(d.error||'تعذر تحديث المستخدم.')
      setProfiles(prev=>prev.map(p=>p.user_id===user_id?{...p,...patch}:p))
      setSuccess('تم حفظ التعديل وتطبيق الصلاحية الجديدة.')
    }catch(e){setError(e instanceof Error?e.message:'تعذر تحديث المستخدم.')}
    finally{setSavingId('')}
  }

  function toggleBranch(userId:string,branchId:string){
    setAccessDraft(prev=>{
      const ids=prev[userId]||[]
      return {...prev,[userId]:ids.includes(branchId)?ids.filter(id=>id!==branchId):[...ids,branchId]}
    })
  }

  async function saveAccess(user:Profile){
    if(user.role==='admin')return
    setError('');setSuccess('');setSavingId(user.user_id)
    try{
      const branch_ids=accessDraft[user.user_id]||[]
      const r=await fetch('/api/users/access',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:user.user_id,branch_ids})})
      const d=await r.json();if(!r.ok)throw new Error(d.error||'تعذر حفظ وصول الفروع.')
      setProfiles(prev=>prev.map(p=>p.user_id===user.user_id?{...p,branch_ids:d.branch_ids}:p))
      setSuccess('تم حفظ فروع الوصول للمستخدم: '+(branch_ids.length?branch_ids.map(id=>branches.find(b=>b.id===id)?.name).filter(Boolean).join('، '):'لا يوجد فرع محدد'))
    }catch(e){setError(e instanceof Error?e.message:'تعذر حفظ وصول الفروع.')}
    finally{setSavingId('')}
  }

  return <main dir="rtl" className="min-h-screen bg-[#f5f7fa]">
    <header className="bg-[#09233f] text-white px-6 py-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><div className="text-[#d4a72c] font-bold text-sm">إدارة النظام</div><h1 className="text-2xl font-black mt-1">المستخدمون والصلاحيات</h1><p className="text-white/60 text-sm mt-1">إدارة الأدوار وتحديد الشركات/الفروع التي يستطيع كل مستخدم الوصول إليها.</p></div>
        <button onClick={()=>{setShowModal(true);setError('');setSuccess('')}} className="bg-[#b88618] hover:bg-[#d4a72c] rounded-xl px-5 py-3 font-black flex items-center justify-center gap-2"><UserPlus size={19}/> إضافة مستخدم</button>
      </div>
    </header>
    <div className="max-w-7xl mx-auto p-6 md:p-10">
      {error&&<div className="mb-5 rounded-2xl border border-red-200 bg-red-50 text-red-700 p-4 font-bold">{error}</div>}
      {success&&<div className="mb-5 rounded-2xl border border-green-200 bg-green-50 text-green-700 p-4 font-bold">{success}</div>}
      <div className="grid sm:grid-cols-4 gap-4 mb-7">
        <div className="card p-5"><Users className="text-[#b88618]"/><div className="text-slate-500 text-sm mt-3">إجمالي المستخدمين</div><div className="text-3xl font-black text-[#09233f] mt-1">{profiles.length}</div></div>
        <div className="card p-5"><ShieldCheck className="text-[#b88618]"/><div className="text-slate-500 text-sm mt-3">المديرون</div><div className="text-3xl font-black text-[#09233f] mt-1">{profiles.filter(p=>p.role==='admin').length}</div></div>
        <div className="card p-5"><KeyRound className="text-[#b88618]"/><div className="text-slate-500 text-sm mt-3">المستخدمون النشطون</div><div className="text-3xl font-black text-[#09233f] mt-1">{profiles.filter(p=>p.is_active).length}</div></div>
        <div className="card p-5"><Building2 className="text-[#b88618]"/><div className="text-slate-500 text-sm mt-3">الفروع المتاحة</div><div className="text-3xl font-black text-[#09233f] mt-1">{branches.length}</div></div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <div className="font-black text-[#09233f]">قائمة المستخدمين والوصول إلى الفروع</div>
          <div className="text-sm text-slate-500 mt-1">لا يتم تعيين أي فرع تلقائياً. مدير النظام له وصول كامل للعميل، وباقي المستخدمين يجب تحديد فروعهم صراحة.</div>
        </div>
        {pageLoading?<div className="p-12 text-center text-slate-500">جاري تحميل المستخدمين والصلاحيات...</div>:profiles.length?<div className="divide-y divide-slate-100">
          {profiles.map(p=><div key={p.user_id} className="p-5">
            <div className="grid xl:grid-cols-[1fr_1.7fr] gap-6 items-start">
              <div>
                <div className="font-black text-[#09233f]">{p.display_name||'بدون اسم'}</div>
                <div className="text-sm text-slate-500 mt-1">{p.email||'البريد غير متاح'}</div>
                <div className="text-xs text-slate-400 mt-1">آخر دخول: {p.last_sign_in_at?new Date(p.last_sign_in_at).toLocaleString('ar-SA'):'لم يسجل دخولاً بعد'}</div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <select disabled={savingId===p.user_id||p.email?.toLowerCase()==='hr@albenyah.sa'} value={p.role} onChange={e=>updateUser(p.user_id,{role:e.target.value})} className="input min-w-[190px] text-sm">
                    {Object.entries(roleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}
                  </select>
                  <button disabled={savingId===p.user_id||p.email?.toLowerCase()==='hr@albenyah.sa'} onClick={()=>updateUser(p.user_id,{is_active:!p.is_active})} className={\`rounded-xl px-4 py-2 text-sm font-black inline-flex items-center gap-2 disabled:opacity-50 \${p.is_active?'bg-red-50 text-red-700 border border-red-200':'bg-green-50 text-green-700 border border-green-200'}\`}>
                    {p.is_active?<><X size={16}/> إيقاف الحساب</>:<><Check size={16}/> تفعيل الحساب</>}
                  </button>
                  <span className={\`px-3 py-2 rounded-xl text-xs font-bold \${p.is_active?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}\`}>{p.is_active?'نشط':'موقوف'}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div><div className="font-black text-[#09233f]">الشركات / الفروع المسموح بها</div><div className="text-xs text-slate-500 mt-1">{p.role==='admin'?'مدير النظام: وصول كامل لجميع فروع العميل.':'حدد فرعاً أو أكثر لهذا المستخدم.'}</div></div>
                  {p.role!=='admin'&&<button onClick={()=>saveAccess(p)} disabled={savingId===p.user_id} className="rounded-xl bg-[#09233f] text-white px-4 py-2 text-sm font-black inline-flex items-center gap-2 disabled:opacity-50"><Save size={16}/> حفظ الفروع</button>}
                </div>
                {p.role==='admin'?<div className="rounded-xl bg-white border border-green-200 text-green-700 p-3 text-sm font-bold">✓ وصول كامل للعميل الحالي — لا يحتاج تعيين فروع.</div>:
                  branches.length?<div className="grid md:grid-cols-3 gap-3">{branches.map(b=><label key={b.id} className="bg-white border border-slate-200 rounded-xl p-3 cursor-pointer hover:border-[#b88618] flex gap-3 items-start"><input type="checkbox" className="mt-1 h-4 w-4" checked={(accessDraft[p.user_id]||[]).includes(b.id)} onChange={()=>toggleBranch(p.user_id,b.id)}/><span><span className="block font-black text-sm text-[#09233f]">{b.name}</span><span className="block text-xs text-slate-400 mt-1">{b.unified_number||'بدون رقم موحد'}</span></span></label>)}</div>:
                  <div className="text-slate-500 text-sm">لا توجد فروع نشطة للعميل.</div>}
              </div>
            </div>
          </div>)}
        </div>:<div className="p-12 text-center text-slate-500">لا يوجد مستخدمون مسجلون في ملف الصلاحيات بعد.</div>}
      </div>
    </div>

    {showModal&&<div className="fixed inset-0 z-[100] bg-[#06172a]/70 backdrop-blur-sm p-4 flex items-center justify-center"><div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden">
      <div className="bg-[#09233f] text-white p-6 flex items-center justify-between"><div><div className="text-[#d4a72c] text-sm font-bold">مستخدم جديد</div><h2 className="text-xl font-black mt-1">إضافة مستخدم للنظام</h2></div><button onClick={()=>setShowModal(false)} className="text-white/70 hover:text-white text-2xl">×</button></div>
      <form onSubmit={submit} className="p-6 space-y-4">
        <label className="block text-sm font-bold text-[#09233f]">اسم المستخدم<input required value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} className="input mt-2" placeholder="مثال: أحمد محمد"/></label>
        <label className="block text-sm font-bold text-[#09233f]">البريد الإلكتروني<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="input mt-2" placeholder="name@company.com"/></label>
        <label className="block text-sm font-bold text-[#09233f]">كلمة المرور<div className="relative mt-2"><input required minLength={8} type={showPassword?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="input pl-12" placeholder="8 أحرف على الأقل"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute left-3 top-3 text-slate-400">{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></div></label>
        <label className="block text-sm font-bold text-[#09233f]">الصلاحية<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="input mt-2">{Object.entries(roleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">سيتم حفظ الصلاحية مع المستخدم. بعد الإنشاء يمكنك تحديد الشركات/الفروع المسموح له بالوصول إليها.</div>
        <div className="flex gap-3 pt-2"><button type="button" onClick={()=>setShowModal(false)} className="flex-1 rounded-xl border border-slate-200 py-3 font-bold">إلغاء</button><button disabled={loading} className="flex-1 rounded-xl bg-[#09233f] text-white py-3 font-black disabled:opacity-60">{loading?'جاري الإنشاء...':'إنشاء المستخدم'}</button></div>
      </form>
    </div></div>}
  </main>
}
