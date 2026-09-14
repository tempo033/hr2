'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, Save, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function OfferForm({ params }: { params: Promise<{ candidateId: string }> }) {
  const [id, setId] = useState('')
  const [candidate, setCandidate] = useState<any>(null)
  const [request, setRequest] = useState<any>(null)
  const [approval, setApproval] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [form, setForm] = useState({
    job_title: '', department: '', project_name: '', work_location: '', start_date: '',
    salary: '', contract_type: '', notes: '', issue_date: '', offer_validity: '7 أيام',
    work_hours: '8 ساعات يوميًا', work_days: '6 أيام أسبوعيًا', annual_leave: '21 يومًا',
    probation: '90 يومًا', health_insurance: 'حسب سياسة الشركة',
  })

  useEffect(() => { params.then(p => setId(p.candidateId)) }, [params])
  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      const [{ data: c }, { data: a }, { data: r }] = await Promise.all([
        supabase.from('candidates').select('*').eq('id', id).maybeSingle(),
        supabase.from('candidate_hiring_approvals').select('*').eq('candidate_id', id).maybeSingle(),
        supabase.from('requests').select('*').limit(1000),
      ])
      const req = (r || []).find((x: any) => x.id === c?.request_id)
      setCandidate(c); setApproval(a); setRequest(req)
      setForm(f => ({
        ...f,
        job_title: a?.job_title || req?.exact_type || '',
        department: a?.department || '',
        project_name: a?.project_name || '',
        work_location: a?.work_location || '',
        start_date: a?.start_date || '',
        salary: a?.salary || '',
        contract_type: a?.contract_type || '',
        notes: a?.notes || '',
        issue_date: a?.offer_sent_at ? new Date(a.offer_sent_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
      }))
      setLoading(false)
    })()
  }, [id])

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))
  const save = async () => {
    if (!approval) return
    setSaving(true); setMessage('')
    const payload: any = { start_date: form.start_date || null, salary: form.salary || null, contract_type: form.contract_type || null, notes: form.notes || null }
    const { error } = await supabase.from('candidate_hiring_approvals').update(payload).eq('candidate_id', id)
    setMessage(error ? `تعذر الحفظ: ${error.message}` : 'تم حفظ بيانات العرض.')
    setSaving(false)
  }

  if (loading) return <div dir="rtl" className="p-10 text-center font-bold text-[#09233f]">جاري تجهيز النموذج...</div>
  if (!candidate) return <div dir="rtl" className="p-10 text-center font-bold text-slate-700">لم يتم العثور على المرشح.</div>

  const isAccepted = approval?.offer_status === 'موافق'
  const isDeclined = approval?.offer_status === 'غير موافق'
  const respondedDate = approval?.offer_responded_at ? new Date(approval.offer_responded_at).toLocaleDateString('ar-SA') : ''

  return (
    <main dir="rtl" className="min-h-screen bg-[#ececec] py-6 print:bg-white text-[#09233f]">
      <div className="print-toolbar max-w-[900px] mx-auto mb-4 flex flex-wrap gap-2 justify-between items-center">
        <Link href="/offers" className="rounded-xl border bg-white px-4 py-2 font-bold inline-flex gap-2 items-center hover:bg-slate-50">
          <ArrowLeft size={17}/> العروض
        </Link>
        <div className="flex gap-2 items-center">
          {approval?.offer_token && (
            <Link
              href={`/offer/${approval.offer_token}`}
              target="_blank"
              className="rounded-xl bg-white border border-[#b88618] text-[#b88618] px-4 py-2 font-bold inline-flex gap-2 items-center hover:bg-[#fff9e8]"
            >
              رابط توقيع المرشح
            </Link>
          )}
          <button onClick={save} disabled={saving} className="rounded-xl bg-[#09233f] text-white px-4 py-2 font-bold inline-flex gap-2 items-center hover:bg-opacity-90">
            <Save size={17}/>{saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button onClick={() => window.print()} className="rounded-xl bg-[#b88618] text-white px-4 py-2 font-bold inline-flex gap-2 items-center hover:bg-opacity-90">
            <Printer size={17}/> طباعة A4
          </button>
        </div>
      </div>

      <section className="a4 max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-md p-[12mm] text-[11px] leading-[1.55]">
        {/* APPROVAL STATUS BADGE ON PRINTABLE FORM */}
        {isAccepted && (
          <div className="mb-4 border-2 border-green-600 bg-green-50 p-2.5 rounded-lg flex items-center justify-between text-green-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-600 shrink-0" />
              <span className="font-bold text-xs">
                تم قبول العرض الوظيفي والموافقة عليه إلكترونيًا من قبل المرشح {respondedDate ? `بتاريخ ${respondedDate}` : ''}
              </span>
            </div>
            <span className="bg-green-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded">موافق عليه رسمياً</span>
          </div>
        )}

        {isDeclined && (
          <div className="mb-4 border-2 border-red-600 bg-red-50 p-2.5 rounded-lg text-red-900 font-bold text-xs">
            تم الاعتذار عن هذا العرض الوظيفي من قبل المرشح {respondedDate ? `بتاريخ ${respondedDate}` : ''}.
          </div>
        )}

        <header className="border-b-2 border-[#b88618] pb-3 text-center">
          <div className="text-[#09233f] text-xl font-black">البنية الاساسية للمقاولات ذ.م.م</div>
          <div className="text-[#b88618] font-bold tracking-widest mt-1">خطاب عرض وظيفي | JOB OFFER LETTER</div>
          <div className="text-slate-500 mt-1">التاريخ: {form.issue_date || '—'} &nbsp; | &nbsp; صلاحية العرض: {form.offer_validity}</div>
        </header>

        <div className="mt-4 border border-slate-300 p-3 grid grid-cols-2 gap-x-5 gap-y-2">
          <label>اسم المرشح<input value={candidate.full_name || ''} readOnly className="field"/></label>
          <label>رقم الجوال<input value={candidate.phone || ''} readOnly className="field"/></label>
          <label>المسمى الوظيفي<input value={form.job_title} onChange={e=>update('job_title',e.target.value)} className="field editable"/></label>
          <label>القسم<input value={form.department} onChange={e=>update('department',e.target.value)} className="field editable"/></label>
          <label>المشروع / الموقع<input value={form.project_name} onChange={e=>update('project_name',e.target.value)} className="field editable"/></label>
          <label>مكان العمل<input value={form.work_location} onChange={e=>update('work_location',e.target.value)} className="field editable"/></label>
        </div>

        <h3 className="section">تفاصيل العرض <span>/ OFFER DETAILS</span></h3>
        <table className="w-full border-collapse">
          <tbody>
            {([
              ['تاريخ المباشرة','start_date'],
              ['الراتب / الأجر الشهري','salary'],
              ['نوع العقد','contract_type'],
              ['ساعات العمل','work_hours'],
              ['أيام العمل','work_days'],
              ['الإجازة السنوية','annual_leave'],
              ['فترة التجربة','probation'],
              ['التأمين الطبي','health_insurance']
            ] as const).map(([label,key])=>(
              <tr key={key}>
                <th>{label}</th>
                <td><input value={(form as any)[key]} onChange={e=>update(key,e.target.value)} className="w-full bg-transparent outline-none editable"/></td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="section">الشروط والأحكام العامة <span>/ GENERAL TERMS</span></h3>
        <ol className="space-y-1 pr-5 list-decimal text-slate-700">
          <li>يخضع العرض لعقد العمل والأنظمة واللوائح المعمول بها في المملكة العربية السعودية.</li>
          <li>تحدد مهام الوظيفة ومسؤولياتها وفق المسمى الوظيفي ومتطلبات الشركة والمشروع.</li>
          <li>تطبق فترة التجربة والأحكام المتعلقة بالإجازات والتأمينات وفق العقد والسياسات المعتمدة.</li>
          <li>تلتزم جميع الأطراف بالمحافظة على سرية المعلومات والبيانات والمستندات الخاصة بالعمل.</li>
          <li>يعتبر هذا العرض ساريًا لمدة {form.offer_validity} من تاريخ إصداره ما لم يتم تمديده كتابيًا.</li>
        </ol>

        <h3 className="section">ملاحظات <span>/ NOTES</span></h3>
        <textarea value={form.notes} onChange={e=>update('notes',e.target.value)} className="w-full border border-slate-300 p-2 min-h-[50px] editable text-xs"/>

        <div className="grid grid-cols-2 gap-8 mt-8 text-center">
          <div className="signature">
            <b>عن الشركة | For the Company</b>
            <div className="line flex items-center justify-center">
              <span className="text-[10px] text-slate-500 font-bold">المدير العام / معتمد ومختوم</span>
            </div>
            <span>الاسم / التوقيع / الختم</span>
          </div>
          <div className="signature">
            <b>قبول المرشح | Candidate Acceptance</b>
            <div className="line flex items-center justify-center">
              {isAccepted ? (
                <span className="text-xs font-bold text-green-700">
                  {candidate.full_name} (موافق وموقع إلكترونياً ✓)
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">........................................</span>
              )}
            </div>
            <span>{candidate.full_name} &nbsp; {respondedDate ? `(${respondedDate})` : ''}</span>
          </div>
        </div>

        {message && <div className="mt-4 p-2 border text-center font-bold">{message}</div>}
      </section>

      <style jsx global>{`
        @page { size: A4 portrait; margin: 0; }
        .a4 label { display: block; font-weight: 700; }
        .field { display: block; width: 100%; border: 0; border-bottom: 1px solid #cbd5e1; padding: 3px 2px; margin-top: 2px; background: transparent; outline: 0; font-weight: 400; }
        .section { margin: 12px 0 6px; padding: 4px 7px; border-top: 1.5px solid #b88618; border-bottom: 1.5px solid #b88618; font-weight: 800; display: flex; justify-content: space-between; }
        .section span { color: #b88618; direction: ltr; font-size: 10px; }
        .a4 th, .a4 td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        .a4 th { width: 31%; text-align: right; background: #f8fafc; }
        .signature { min-height: 70px; border-top: 1px solid #b88618; padding-top: 6px; }
        .line { border-bottom: 1px dotted #777; height: 32px; margin: 0 15px 3px; }
        .editable:focus { background: #fff9e8; }
        @media print {
          .print-toolbar { display: none !important; }
          .a4 { box-shadow: none !important; margin: 0 !important; max-width: none !important; width: 210mm !important; min-height: 297mm !important; }
          .editable { background: transparent !important; }
        }
      `}</style>
    </main>
  )
}
