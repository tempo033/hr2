'use client'
import {useEffect,useState} from 'react'
import {useParams} from 'next/navigation'
import RequestForm from '@/app/forms/shared/RequestForm'
import ClearancePublic from '@/app/forms/clearance/ClearancePublic'
export default function PublicFormPage(){
 const params=useParams<{token:string}>()
 const [kind,setKind]=useState<'leave'|'clearance'|'advance'|null>(null),[scope,setScope]=useState(''),[error,setError]=useState('')
 useEffect(()=>{if(!params?.token)return;fetch('/api/forms/public/'+params.token,{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'تعذر فتح النموذج');setKind(d.link.form_type);setScope(d.link.link_scope||'')}).catch(e=>setError(e.message))},[params?.token])
 if(error)return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="bg-white border rounded-2xl p-8 text-center"><h1 className="font-black text-xl text-red-700">تعذر فتح النموذج</h1><p className="text-slate-500 mt-2">{error}</p></div></main>
 if(!kind)return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">جارٍ فتح النموذج...</main>
 if(kind==='clearance'&&scope.startsWith('clearance:'))return <ClearancePublic token={params.token}/>
 return <RequestForm kind={kind} publicToken={params.token}/>
}