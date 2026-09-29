'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Building2, Plus, Pencil, Power, RefreshCw, Search, X, CheckCircle2, CircleOff } from 'lucide-react'

type Company = {
  id:string; name:string; name_en:string|null; unified_number:string; commercial_registration:string|null;
  company_type:string|null; parent_company_id:string|null; is_active:boolean; notes:string|null;
  created_at:string; updated_at:string; parent?:{id:string;name:string;unified_number:string}|null
}

const emptyForm = {
  name:'', name_en:'', unified_number:'', commercial_registration:'', company_type:'شركة',
  parent_company_id:'', is_active:true, notes:''
}

export default function CompaniesPage(){
  const [companies,setCompanies]=useState<Company[]>([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [message,setMessage]=useState('')
  const [search,setSearch]=useState('')
  const [includeInactive,setIncludeInactive]=useState(true)
  const [editing,setEditing]=useState<Company|null>(null)
  const [showForm,setShowForm]=useState(false)
  const [form,setForm]=useState({...emptyForm})

  const load=async()=>{
    setLoading(true);setError('')
    try{
      const r=await fetch('/api/companies?include_inactive=1',{cache:'no-store'})
      const b=await r.json()
      if(!r.ok)throw new Error(b.error||'تعذر تحميل الشركات')
      setCompanies(b.companies||[])
    }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل الشركات')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[])

  const rows=useMemo(()=>{
    const q=search.trim().toLowerCase()
    return companies.filter(c=>{
      if(!includeInactive&&!c.is_active)return false
      if(!q)return true
      return [c.name,c.name_en,c.unified_number,c.commercial_registration,c.company_type,c.parent?.name].some(v=>String(v||'').toLowerCase().includes(q))
    })
  },[companies,search,includeInactive])

  const openNew=()=>{setEditing(null);setForm({...emptyForm});setError('');setMessage('');setShowForm(true)}
  const openEdit=(c:Company)=>{setEditing(c);setForm({name:c.name,name_en:c.name_en||'',unified_number:c.unified_number||'',commercial_registration:c.commercial_registration||'',company_type:c.company_type||'شركة',parent_company_id:c.parent_company_id||'',is_active:c.is_active,notes:c.notes||''});setError('');setMessage('');setShowForm(true)}
  const save=async()=>{
    setSaving(true);setError('');setMessage('')
    try{
      const r=await fetch('/api/companies',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editing?{id:editing.id,...form}:{...form})})
      const b=await r.json()
      if(!r.ok)throw new Error(b.error||'تعذر حفظ الشركة')
      setMessage(editing?'تم تحديث بيانات الشركة.':'تمت إضافة الشركة بنجاح.')
      await load()
      setTimeout(()=>setShowForm(false),500)
    }catch(e){setError(e instanceof Error?e.message:'تعذر حفظ الشركة')}
    finally{setSaving(false)}
  }
  const toggle=async(c:Company)=>{
    if(!confirm(c.is_active?'سيتم تعطيل الشركة مع الاحتفاظ بكل بياناتها وموظفيها. هل تريد المتابعة؟':'سيتم إعادة تفعيل الشركة. هل تريد المتابعة؟'))return
    try{
      const r=await fetch('/api/companies',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:c.id,is_active:!c.is_active})})
      const b=await r.json()
      if(!r.ok)throw new Error(b.error||'تعذر تغيير حالة الشركة')
      await load()
    }catch(e){alert(e instanceof Error?e.message:'تعذر تغيير حالة الشركة')}
  }

  return <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8">
    <div className="max-w-[1500px] mx-auto">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#09233f] text-[#d4a72c] grid place-items-center"><Building2 size={28}/></div>
          <div><div className="text-sm text-[#b88618] font-bold">الإدارة المركزية</div><h1 className="text-3xl font-black text-[#09233f]">إدارة الشركات</h1><p className="text-slate-500 mt-1">مصدر الشركات المركزي المستخدم في ملفات الموظفين والتقارير واللوحات.</p></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openNew} className="rounded-xl bg-[#b88618] text-white px-4 py-2.5 font-black inline-flex items-center gap-2"><Plus size={18}/> إضافة شركة</button>
          <button onClick={()=>void load()} className="rounded-xl bg-white border px-4 py-2.5 font-bold inline-flex items-center gap-2"><RefreshCw size={17}/> تحديث</button>
          <Link href="/employees" className="rounded-xl bg-white border px-4 py-2.5 font-bold">قائمة الموظفين</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border rounded-2xl p-4"><div className="text-sm text-slate-500">إجمالي الشركات</div><div className="text-2xl font-black text-[#09233f] mt-1">{companies.length}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-sm text-slate-500">الشركات النشطة</div><div className="text-2xl font-black text-emerald-700 mt-1">{companies.filter(c=>c.is_active).length}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-sm text-slate-500">الشركات غير النشطة</div><div className="text-2xl font-black text-slate-600 mt-1">{companies.filter(c=>!c.is_active).length}</div></div>
        <div className="bg-white border rounded-2xl p-4"><div className="text-sm text-slate-500">الشركات التابعة</div><div className="text-2xl font-black text-[#b88618] mt-1">{companies.filter(c=>c.parent_company_id).length}</div></div>
      </section>

      <section className="bg-white border rounded-2xl p-4 mb-5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1"><Search size={18} className="absolute right-3 top-3 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث باسم الشركة أو الرقم الموحد أو السجل التجاري..." className="w-full border rounded-xl py-2.5 pr-10 pl-3"/></div>
        <label className="flex items-center gap-2 font-bold px-3"><input type="checkbox" checked={includeInactive} onChange={e=>setIncludeInactive(e.target.checked)}/> إظهار غير النشطة</label>
      </section>

      {error&&<div className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 font-bold">{error}</div>}
      {message&&<div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 font-bold">{message}</div>}

      <section className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        {loading?<div className="p-12 text-center text-slate-500">جاري تحميل الشركات...</div>:
        <div className="overflow-auto"><table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-[#09233f] text-white"><tr>
            {['الشركة بالعربي','English Name','الرقم الموحد','السجل التجاري','نوع الشركة','الرئيسية / المجموعة','الحالة','تاريخ الإضافة','الإجراءات'].map(h=><th key={h} className="p-4 text-right whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>{rows.map(c=><tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
            <td className="p-4 font-black text-[#09233f]">{c.name}</td><td className="p-4">{c.name_en||'—'}</td><td className="p-4 font-bold">{c.unified_number}</td><td className="p-4">{c.commercial_registration||'—'}</td><td className="p-4">{c.company_type||'—'}</td><td className="p-4">{c.parent?.name||'شركة رئيسية'}</td>
            <td className="p-4">{c.is_active?<span className="inline-flex items-center gap-1 text-emerald-700 font-black"><CheckCircle2 size={16}/> نشطة</span>:<span className="inline-flex items-center gap-1 text-slate-500 font-black"><CircleOff size={16}/> غير نشطة</span>}</td>
            <td className="p-4">{c.created_at?new Date(c.created_at).toLocaleDateString('ar-SA'):'—'}</td>
            <td className="p-4"><div className="flex gap-2"><button onClick={()=>openEdit(c)} className="rounded-lg border px-3 py-2 font-bold inline-flex items-center gap-1"><Pencil size={15}/> تعديل</button><button onClick={()=>void toggle(c)} className={'rounded-lg border px-3 py-2 font-bold inline-flex items-center gap-1 '+(c.is_active?'text-red-700':'text-emerald-700')}><Power size={15}/>{c.is_active?'تعطيل':'تفعيل'}</button></div></td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      {showForm&&<div className="fixed inset-0 z-50 bg-black/40 p-4 grid place-items-center">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
          <div className="flex items-center justify-between p-5 border-b"><div><h2 className="text-xl font-black text-[#09233f]">{editing?'تعديل الشركة':'إضافة شركة جديدة'}</h2><p className="text-sm text-slate-500 mt-1">الرقم الموحد معرف فريد ولا يمكن تكراره.</p></div><button onClick={()=>setShowForm(false)}><X/></button></div>
          <div className="p-5 grid md:grid-cols-2 gap-4">
            {[
              ['name','اسم الشركة بالعربي',true],['name_en','اسم الشركة بالإنجليزي',false],['unified_number','الرقم الموحد',true],['commercial_registration','السجل التجاري',false],['company_type','نوع الشركة',false]
            ].map(([k,l,req])=><label key={k as string} className="font-bold">{l as string}{req&&<span className="text-red-600"> *</span>}<input value={(form as any)[k as string]} onChange={e=>setForm(x=>({...x,[k as string]:e.target.value}))} className="mt-2 w-full border rounded-xl p-3" /></label>)}
            <label className="font-bold">الشركة الرئيسية / المجموعة<select value={form.parent_company_id} onChange={e=>setForm(x=>({...x,parent_company_id:e.target.value}))} className="mt-2 w-full border rounded-xl p-3"><option value="">لا توجد - شركة رئيسية</option>{companies.filter(c=>c.id!==editing?.id).map(c=><option key={c.id} value={c.id}>{c.name} — {c.unified_number}</option>)}</select></label>
            <label className="font-bold">حالة الشركة<select value={form.is_active?'true':'false'} onChange={e=>setForm(x=>({...x,is_active:e.target.value==='true'}))} className="mt-2 w-full border rounded-xl p-3"><option value="true">نشطة</option><option value="false">غير نشطة</option></select></label>
            <label className="font-bold md:col-span-2">ملاحظات<textarea value={form.notes} onChange={e=>setForm(x=>({...x,notes:e.target.value}))} className="mt-2 w-full border rounded-xl p-3 min-h-24"/></label>
          </div>
          {error&&<div className="mx-5 mb-4 rounded-xl bg-red-50 text-red-700 p-3 font-bold">{error}</div>}
          <div className="p-5 border-t flex justify-end gap-2"><button onClick={()=>setShowForm(false)} className="border rounded-xl px-4 py-2.5 font-bold">إلغاء</button><button disabled={saving} onClick={()=>void save()} className="bg-[#09233f] text-white rounded-xl px-5 py-2.5 font-black">{saving?'جاري الحفظ...':'حفظ الشركة'}</button></div>
        </div>
      </div>}
    </div>
  </main>
}
