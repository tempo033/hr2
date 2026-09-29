'use client'
import {useEffect,useState} from 'react'
import PayrollShell from './components/PayrollShell'
import Link from 'next/link'
import {ArrowLeft,AlertTriangle,CheckCircle2,Plus,FileText,Users,WalletCards,MinusCircle} from 'lucide-react'
const metrics=[['إجمالي الرواتب','net','صافي الرواتب'],['إجمالي البدلات','allowances','البدلات'],['العمل الإضافي','overtime','الإضافي'],['الخصومات','deductions','الاستقطاعات'],['صافي الرواتب','net','الصافي'],['الموظفون داخل المسير','employees','عدد الموظفين']]
export default function PayrollDashboard(){
 const[d,setD]=useState<any>(null),[loading,setLoading]=useState(true)
 useEffect(()=>{fetch('/api/payroll?action=dashboard',{cache:'no-store'}).then(r=>r.json()).then(setD).finally(()=>setLoading(false))},[])
 return <PayrollShell>{loading?<div className="payroll-loading"><div className="loading-skeleton h-8 w-52"/><div className="loading-skeleton h-24 w-full"/><div className="loading-skeleton h-64 w-full"/></div>:
 <div className="payroll-dashboard">
  <section className="payroll-overview"><div><span className="hr-page-kicker">CURRENT PERIOD</span><h2>مركز التحكم بالرواتب</h2><p>مراجعة الوضع الحالي للمسير قبل الإنشاء والاعتماد.</p></div><div className="payroll-primary-actions"><Link href="/payroll/runs" className="btn-gold px-4 py-2.5 rounded-lg font-black inline-flex items-center gap-2"><FileText size={16}/> فتح المسيرات</Link><Link href="/payroll/runs" className="btn-primary px-4 py-2.5 rounded-lg font-black inline-flex items-center gap-2"><Plus size={16}/> إنشاء مسير</Link></div></section>
  <section className="payroll-metrics">{metrics.map(([t,k,sub],i)=><div className={`payroll-metric ${i===4?'metric-emphasis':''}`} key={t+i}><span>{sub}</span><strong>{k==='employees'?d?.stats?.employees||0:Number(d?.stats?.[k]||0).toLocaleString('ar-SA')+' ر.س'}</strong><small>{t}</small></div>)}</section>
  <div className="payroll-layout">
   <section className="payroll-current"><div className="panel-head"><div><span className="eyebrow">CURRENT PAYROLL</span><h2>المسير الحالي</h2></div><Link href="/payroll/runs" className="text-link">كل المسيرات <ArrowLeft size={14}/></Link></div>
    {d?.current?<div className="payroll-current-grid"><div><span>الفترة</span><b>{d.current.month}/{d.current.year}</b></div><div><span>الحالة</span><b className="status-badge warning">{d.current.status}</b></div><div><span>عدد الموظفين</span><b>{d.stats.employees}</b></div><div><span>صافي المسير</span><b>{Number(d.stats.net).toLocaleString('ar-SA')} ر.س</b></div></div>:<div className="empty-state"><strong>لا يوجد مسير للشهر الحالي</strong><span>يمكنك إنشاء مسير من زر الإجراء الرئيسي.</span><Link href="/payroll/runs" className="text-link mt-3 inline-flex">إنشاء مسير <ArrowLeft size={14}/></Link></div>}
   </section>
   <aside className="payroll-attention"><div className="panel-head"><div><span className="eyebrow">DATA QUALITY</span><h2>يحتاج مراجعة</h2></div><AlertTriangle size={18} className="text-[#b28a2e]"/></div>{d?.missing?.length?<div className="attention-list">{d.missing.slice(0,12).map((x:any)=><div key={x.id}><span className="attention-dot"/><div><b>{x.name}</b><small>{x.reason}</small></div></div>)}</div>:<div className="attention-ok"><CheckCircle2 size={18}/><span>لا توجد نواقص ظاهرة في البيانات الحالية.</span></div>}</aside>
  </div>
  <section className="payroll-links"><Link href="/payroll/employee"><Users size={18}/><span><b>ملفات الرواتب</b><small>عرض تفاصيل رواتب الموظفين</small></span><ArrowLeft size={15}/></Link><Link href="/payroll/reports"><WalletCards size={18}/><span><b>تقارير الرواتب</b><small>المراجعة والتصدير</small></span><ArrowLeft size={15}/></Link><Link href="/payroll/deductions"><MinusCircle size={18}/><span><b>الخصومات والجزاءات</b><small>متابعة الاستقطاعات</small></span><ArrowLeft size={15}/></Link></section>
 </div>}</PayrollShell>
}