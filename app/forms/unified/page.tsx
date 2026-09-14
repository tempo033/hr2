'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  FileText,
  UserCheck,
  Printer,
  Save,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Building2,
  RotateCcw,
  PenTool,
  ExternalLink,
  ChevronRight,
  ClipboardList
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { generateNextEmployeeNumber } from '@/lib/employee-number'

export default function UnifiedFormsPage() {
  const [activeTab, setActiveTab] = useState<'joining' | 'offer' | 'leave' | 'clearance'>('joining')
  const [candidates, setCandidates] = useState<any[]>([])
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Joining Form State
  const [joiningData, setJoiningData] = useState({
    candidate_id: '',
    employee_number: '',
    employee_name: '',
    nationality: 'سعودي',
    national_id: '',
    job_title: '',
    department: '',
    project_name: '',
    work_location: '',
    actual_join_date: new Date().toISOString().slice(0, 10),
    contract_start_date: new Date().toISOString().slice(0, 10),
    probation_period: '90 يومًا',
    salary: '',
    housing_allowance: '',
    transport_allowance: '',
    other_allowances: '',
    total_salary: '',
    supervisor_name: '',
    supervisor_notes: 'باشر العمل بالموعد المحدد ومستلم لكافة المهام.',
    hr_notes: 'تم استلام وتدقيق مسوغات التعيين وإدراج الموظف بالسجلات.',
    hr_specialist: 'مسؤول الموارد البشرية',
    gm_name: 'المدير العام',
    status: 'معتمد'
  })

  // Offer Form State
  const [offerData, setOfferData] = useState({
    candidate_id: '',
    employee_name: '',
    phone: '',
    nationality: 'سعودي',
    national_id: '',
    job_title: '',
    department: '',
    project_name: '',
    work_location: 'مشاريع الشركة داخل المملكة العربية السعودية',
    working_days_hours: 'من السبت إلى الخميس – (10) ساعات يوميًا شاملة فترات الراحة',
    probation_period: '(90) يومًا من تاريخ المباشرة الفعلية',
    start_date: '',
    salary: '',
    contract_type: 'عقد محدد المدة (سنة واحدة قابلة للتجديد)',
    offer_status: 'بانتظار الرد',
    offer_token: '',
    notes: ''
  })

  // Load candidates for auto-fill dropdown
  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: cands } = await supabase.from('candidates').select('*').order('created_at', { ascending: false })
      setCandidates(cands || [])
      if (cands && cands.length > 0) {
        setSelectedCandidateId(cands[0].id)
        loadCandidateData(cands[0].id)
      } else {
        setLoading(false)
      }
    })()
  }, [])

  const loadCandidateData = async (candId: string) => {
    if (!candId) return
    const [{ data: c }, { data: a }, { data: o }] = await Promise.all([
      supabase.from('candidates').select('*').eq('id', candId).single(),
      supabase.from('candidate_hiring_approvals').select('*').eq('candidate_id', candId).maybeSingle(),
      supabase.from('candidate_onboarding').select('*').eq('candidate_id', candId).maybeSingle(),
    ])

    if (c) {
      // populate Joining
      setJoiningData(prev => ({
        ...prev,
        candidate_id: candId,
        employee_name: c.full_name || '',
        nationality: c.nationality || 'سعودي',
        national_id: c.national_id || '',
        job_title: o?.job_title || a?.job_title || c.specialization || '',
        department: o?.department || a?.department || '',
        project_name: o?.project_name || a?.project_name || '',
        work_location: o?.work_location || a?.work_location || 'المقر الرئيسي / مشاريع الشركة',
        actual_join_date: o?.actual_join_date || a?.start_date || new Date().toISOString().slice(0, 10),
        salary: a?.salary || '',
        total_salary: a?.salary || '',
        employee_number: o?.employee_number || `EMP-${Math.floor(1000 + Math.random() * 9000)}`
      }))

      // populate Offer
      setOfferData(prev => ({
        ...prev,
        candidate_id: candId,
        employee_name: c.full_name || '',
        phone: c.phone || '',
        nationality: c.nationality || 'سعودي',
        national_id: c.national_id || '',
        job_title: a?.job_title || c.specialization || '',
        department: a?.department || '',
        project_name: a?.project_name || '',
        salary: a?.salary || '',
        start_date: a?.start_date || '',
        contract_type: a?.contract_type || 'عقد محدد المدة (سنة واحدة قابلة للتجديد)',
        offer_status: a?.offer_status || 'بانتظار الرد',
        offer_token: a?.offer_token || ''
      }))
    }
    setLoading(false)
  }

  const handleSelectCandidate = (candId: string) => {
    setSelectedCandidateId(candId)
    loadCandidateData(candId)
  }

  const saveJoining = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      let finalEmpNumber = joiningData.employee_number?.trim()
      if (!finalEmpNumber) {
        finalEmpNumber = await generateNextEmployeeNumber()
        setJoiningData(prev => ({ ...prev, employee_number: finalEmpNumber }))
      }

      const payload = {
        candidate_id: joiningData.candidate_id,
        employee_number: finalEmpNumber,
        job_title: joiningData.job_title,
        department: joiningData.department,
        project_name: joiningData.project_name,
        work_location: joiningData.work_location,
        actual_join_date: joiningData.actual_join_date,
        supervisor_notes: joiningData.supervisor_notes,
        hr_notes: joiningData.hr_notes,
        status: joiningData.status
      }

      await supabase.from('candidate_onboarding').upsert(payload, { onConflict: 'candidate_id' })
      setSaveMessage(`تم حفظ نموذج مباشرة العمل بنجاح بالرقم الوظيفي: ${finalEmpNumber}`)
    } catch (e: any) {
      setSaveMessage(`تعذر الحفظ: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const saveOffer = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      const payload = {
        candidate_id: offerData.candidate_id,
        salary: offerData.salary,
        start_date: offerData.start_date || null,
        contract_type: offerData.contract_type,
        notes: offerData.notes,
        updated_at: new Date().toISOString()
      }

      await supabase.from('candidate_hiring_approvals').update(payload).eq('candidate_id', offerData.candidate_id)
      setSaveMessage('تم حفظ نموذج عرض العمل بنجاح.')
    } catch (e: any) {
      setSaveMessage(`تعذر الحفظ: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'joining', label: 'نموذج مباشرة عمل', icon: UserCheck, desc: 'إشعار مباشرة العمل الرسمي للموظف الجديد' },
    { id: 'offer', label: 'نموذج عرض العمل', icon: FileText, desc: 'خطاب العرض الوظيفي والحزمة المالية' },
    { id: 'leave', label: 'طلب إجازة', icon: Calendar, desc: 'نموذج الإجازات السنوية والاضطرارية' },
    { id: 'clearance', label: 'إخلاء طرف', icon: Building2, desc: 'نموذج تصفية وإخلاء العهد والطرف' },
  ]

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] text-slate-800 p-4 md:p-8">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          .paper { box-shadow: none !important; max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .editable { border: none !important; background: transparent !important; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        {/* TOP CONTROLS & HEADER */}
        <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-[#b88618] font-bold text-xs">نظام الموارد البشرية الموحد | HR Forms Hub</div>
            <h1 className="text-2xl md:text-3xl font-black text-[#09233f] mt-1">بوابة النماذج الإدارية وعروض العمل</h1>
            <p className="text-slate-500 text-xs mt-1">نماذج مباشرة العمل وعروض العمل الرسمية متوافقة مع الهيكل المعتمد وقابلة للطباعة والتصدير.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/forms" className="border bg-white rounded-xl px-4 py-2 font-bold text-xs inline-flex items-center gap-1.5 hover:bg-slate-50">
              <ArrowLeft size={16} /> مركز النماذج
            </Link>
            <button
              onClick={() => window.print()}
              className="bg-[#b88618] hover:bg-[#a57714] text-white rounded-xl px-4 py-2 font-bold text-xs inline-flex items-center gap-1.5 shadow"
            >
              <Printer size={16} /> طباعة النموذج A4
            </button>
          </div>
        </div>

        {/* CANDIDATE SELECTOR BAR */}
        <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-[#09233f] text-[#d4a72c] grid place-items-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">اختر المرشح / الموظف للربط التلقائي بالنموذج:</div>
              <select
                value={selectedCandidateId}
                onChange={e => handleSelectCandidate(e.target.value)}
                className="font-bold text-sm text-[#09233f] bg-transparent outline-none cursor-pointer mt-0.5"
              >
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.phone || 'بدون رقم'}) - {c.specialization || 'مرشح'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'joining' && (
              <button
                disabled={saving}
                onClick={saveJoining}
                className="bg-[#09233f] hover:bg-[#123864] text-white px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
              >
                <Save size={15} /> {saving ? 'جاري الحفظ...' : 'حفظ بيانات المباشرة'}
              </button>
            )}
            {activeTab === 'offer' && (
              <>
                {offerData.offer_token && (
                  <Link
                    href={`/offer/${offerData.offer_token}`}
                    target="_blank"
                    className="border border-[#b88618] text-[#b88618] bg-amber-50/50 hover:bg-amber-100 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={14} /> فتح صفحة توقيع المرشح
                  </Link>
                )}
                <button
                  disabled={saving}
                  onClick={saveOffer}
                  className="bg-[#09233f] hover:bg-[#123864] text-white px-5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow"
                >
                  <Save size={15} /> {saving ? 'جاري الحفظ...' : 'حفظ بيانات العرض'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* NOTIFICATION MESSAGE */}
        {saveMessage && (
          <div className="no-print mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs font-bold text-center">
            {saveMessage}
          </div>
        )}

        {/* TAB NAVIGATION (Mirrors hrform style tabs) */}
        <div className="no-print flex border-b border-slate-300 gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-bold text-xs whitespace-nowrap transition border-t-2 ${
                  isActive
                    ? 'bg-white border-[#b88618] text-[#09233f] shadow-sm'
                    : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-[#b88618]' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* TAB CONTENT: DIRECT WORK / JOINING FORM (مباشرة العمل) */}
        {activeTab === 'joining' && (
          <article className="paper max-w-[850px] mx-auto bg-white shadow-xl rounded-xl p-8 md:p-12 text-[12px] leading-relaxed border border-slate-200">
            {/* OFFICIAL HEADER */}
            <header className="border-b-2 border-[#09233f] pb-4 flex justify-between items-center">
              <div>
                <div className="text-xl font-black text-[#09233f]">شركة البنية الأساسية للمقاولات ذ.م.م</div>
                <div className="text-[#b88618] font-bold text-xs">إدارة الموارد البشرية والشؤون الإدارية</div>
                <div className="text-[11px] text-slate-500 mt-0.5">المملكة العربية السعودية</div>
              </div>
              <div className="text-left" dir="ltr">
                <div className="text-xs font-mono font-bold text-[#09233f]">FORM: HR-JOIN-01</div>
                <div className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString('ar-SA')}</div>
                <div className="mt-1 px-2.5 py-0.5 bg-green-50 border border-green-200 text-green-800 rounded text-[10px] font-bold text-center inline-block">
                  OFFICIAL FORM
                </div>
              </div>
            </header>

            <div className="text-center my-4">
              <h1 className="text-2xl font-black text-[#09233f]">نموذج إشعار مباشرة عمل</h1>
              <div className="text-xs text-[#b88618] font-bold">WORK COMMENCEMENT & ONBOARDING FORM</div>
            </div>

            {/* EMPLOYEE INFO TABLE */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
              <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
                <span>أولاً: البيانات الأساسية للموظف</span>
                <span dir="ltr">EMPLOYEE BASIC INFORMATION</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50/50 text-[11.5px]">
                <div>
                  <span className="font-bold text-[#09233f]">اسم الموظف رباعياً:</span>
                  <input
                    value={joiningData.employee_name}
                    onChange={e => setJoiningData({ ...joiningData, employee_name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 font-bold editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">الرقم الوظيفي:</span>
                  <input
                    value={joiningData.employee_number}
                    onChange={e => setJoiningData({ ...joiningData, employee_number: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 font-mono editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">الجنسية:</span>
                  <input
                    value={joiningData.nationality}
                    onChange={e => setJoiningData({ ...joiningData, nationality: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">رقم الهوية الوطنية / الإقامة:</span>
                  <input
                    value={joiningData.national_id}
                    onChange={e => setJoiningData({ ...joiningData, national_id: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
              </div>
            </div>

            {/* JOB DETAILS */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
              <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
                <span>ثانيًا: بيانات التعيين والمباشرة</span>
                <span dir="ltr">ASSIGNMENT & COMMENCEMENT DETAILS</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50/50 text-[11.5px]">
                <div>
                  <span className="font-bold text-[#09233f]">المسمى الوظيفي:</span>
                  <input
                    value={joiningData.job_title}
                    onChange={e => setJoiningData({ ...joiningData, job_title: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 font-bold editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">الإدارة / القسم:</span>
                  <input
                    value={joiningData.department}
                    onChange={e => setJoiningData({ ...joiningData, department: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">المشروع المكلف به:</span>
                  <input
                    value={joiningData.project_name}
                    onChange={e => setJoiningData({ ...joiningData, project_name: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">مقر ومكان العمل:</span>
                  <input
                    value={joiningData.work_location}
                    onChange={e => setJoiningData({ ...joiningData, work_location: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">تاريخ المباشرة الفعلية للعمل:</span>
                  <input
                    type="date"
                    value={joiningData.actual_join_date}
                    onChange={e => setJoiningData({ ...joiningData, actual_join_date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 font-bold editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">مدة فترة التجربة:</span>
                  <input
                    value={joiningData.probation_period}
                    onChange={e => setJoiningData({ ...joiningData, probation_period: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
              </div>
            </div>

            {/* SUPERVISOR ACKNOWLEDGEMENT */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
              <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
                <span>ثالثًا: إقرار المشرف المباشر وإدارة الموارد البشرية</span>
                <span dir="ltr">SUPERVISOR & HR ENDORSEMENT</span>
              </div>
              <div className="p-3 text-[11.5px] space-y-3 bg-slate-50/50">
                <div>
                  <span className="font-bold text-[#09233f] block">إفادة المشرف المباشر:</span>
                  <p className="text-slate-600 mt-0.5 text-xs leading-relaxed">
                    أفيد بأن الموظف المذكور أعلاه قد باشر عمله لدينا فعلياً واستلم مهام وظيفته في التاريخ المحدد.
                  </p>
                  <textarea
                    rows={2}
                    value={joiningData.supervisor_notes}
                    onChange={e => setJoiningData({ ...joiningData, supervisor_notes: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-1 text-xs editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f] block">ملاحظات واعتماد الموارد البشرية:</span>
                  <textarea
                    rows={2}
                    value={joiningData.hr_notes}
                    onChange={e => setJoiningData({ ...joiningData, hr_notes: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-1 text-xs editable"
                  />
                </div>
              </div>
            </div>

            {/* SIGNATURE BLOCK */}
            <div className="mt-8 border-t-2 border-slate-300 pt-4 grid grid-cols-3 gap-6 text-center text-[11px]">
              <div>
                <div className="font-bold text-[#09233f]">الموظف | Employee</div>
                <div className="mt-1 text-xs">{joiningData.employee_name}</div>
                <div className="h-10 border-b border-dotted border-slate-400 mt-1" />
                <div className="text-slate-400 text-[10px] mt-0.5">التوقيع والتاريخ</div>
              </div>
              <div>
                <div className="font-bold text-[#09233f]">المشرف المباشر | Supervisor</div>
                <div className="mt-1 text-xs">مدير المشروع / القسم</div>
                <div className="h-10 border-b border-dotted border-slate-400 mt-1" />
                <div className="text-slate-400 text-[10px] mt-0.5">الاعتماد والتاريخ</div>
              </div>
              <div>
                <div className="font-bold text-[#09233f]">الموارد البشرية | HR Dept</div>
                <div className="mt-1 text-xs">مسؤول التوظيف والتعيين</div>
                <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center">
                  <span className="text-[9px] text-[#b88618] font-bold border border-[#b88618] px-2 py-0.5 rounded">
                    معتمد ومسجل
                  </span>
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">الختم والتاريخ</div>
              </div>
            </div>
          </article>
        )}

        {/* TAB CONTENT: JOB OFFER FORM (عرض العمل) */}
        {activeTab === 'offer' && (
          <article className="paper max-w-[850px] mx-auto bg-white shadow-xl rounded-xl p-8 md:p-12 text-[12px] leading-relaxed border border-slate-200">
            {/* APPROVAL STATUS BANNER */}
            {offerData.offer_status === 'موافق' && (
              <div className="mb-4 border-2 border-green-600 bg-green-50 p-3 rounded-xl flex items-center justify-between text-green-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-600 shrink-0" />
                  <div>
                    <div className="font-bold text-xs">تمت الموافقة الرسمية وتوقيع العرض من قبل المرشح</div>
                    <div className="text-[11px] text-green-700">العرض معتمد ومستوفي لجميع بنود نظام العمل السعودي.</div>
                  </div>
                </div>
                <span className="bg-green-600 text-white font-black text-[11px] px-3 py-1 rounded-lg">
                  موافق ومعتمد ✓
                </span>
              </div>
            )}

            <header className="text-center border-b-2 border-[#09233f] pb-4">
              <div className="font-black text-[#09233f] text-xl">شركة البنية الأساسية للمقاولات ذ.م.م</div>
              <h2 className="text-2xl font-black mt-2 text-[#09233f]">عرض عمل وظيفي</h2>
              <div className="tracking-[0.35em] font-bold text-[#b88618]">JOB OFFER</div>
              <div className="mt-1 text-[11px] text-slate-500">خاص وسري &nbsp; · &nbsp; PRIVATE & CONFIDENTIAL</div>
            </header>

            <p className="mt-4">السيد/السيدة <b>{offerData.employee_name}</b> المحترم/ة،</p>
            <p className="mt-1 text-justify text-[11.5px]">
              يسر شركة البنية الأساسية للمقاولات ذ.م.م أن تتقدم لسعادتكم بعرض عمل لشغل وظيفة <b>{offerData.job_title || '—'}</b>، وذلك وفقاً للشروط والأحكام أدناه:
            </p>

            {/* DETAILS TABLE */}
            <div className="border border-slate-300 rounded-lg overflow-hidden mt-4 text-[11.5px]">
              <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
                <span>بيانات الوظيفة والحزمة المالية</span>
                <span dir="ltr">POSITION & FINANCIAL DETAILS</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50/50">
                <div>
                  <span className="font-bold text-[#09233f]">المسمى الوظيفي:</span>
                  <input
                    value={offerData.job_title}
                    onChange={e => setOfferData({ ...offerData, job_title: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 font-bold editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">إجمالي الأجر الشهري:</span>
                  <input
                    value={offerData.salary}
                    onChange={e => setOfferData({ ...offerData, salary: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 font-bold text-[#09233f] editable"
                    placeholder="مثال: 12,000 ريال سعودي"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">مقر العمل:</span>
                  <input
                    value={offerData.work_location}
                    onChange={e => setOfferData({ ...offerData, work_location: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">ساعات العمل:</span>
                  <input
                    value={offerData.working_days_hours}
                    onChange={e => setOfferData({ ...offerData, working_days_hours: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">فترة التجربة:</span>
                  <input
                    value={offerData.probation_period}
                    onChange={e => setOfferData({ ...offerData, probation_period: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
                <div>
                  <span className="font-bold text-[#09233f]">تاريخ المباشرة المتوقع:</span>
                  <input
                    type="date"
                    value={offerData.start_date}
                    onChange={e => setOfferData({ ...offerData, start_date: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded p-1.5 mt-0.5 editable"
                  />
                </div>
              </div>
            </div>

            {/* GENERAL TERMS */}
            <div className="mt-4 border border-slate-200 bg-slate-50 p-3 rounded-lg text-[11px] leading-relaxed">
              <div className="font-bold text-[#09233f] mb-1">أحكام عامة:</div>
              <ol className="list-decimal mr-5 space-y-1 text-slate-700">
                <li>يخضع العرض لإجراءات المقابلة الفنية واعتماد الإدارة، ولا يعتبر نافذاً إلا بعد المباشرة الفعلية وتسجيل الحضور الموثق.</li>
                <li>يشمل العرض التسجيل في التأمينات الاجتماعية والتأمين الطبي وفق أنظمة ولوائح المملكة العربية السعودية.</li>
                <li>يستحق شاغل الوظيفة بونص أداء متغير يصل حتى 50% يرتبط بمستخلصات المشاريع وجودة التنفيذ وتقييم الإدارة.</li>
              </ol>
            </div>

            {/* SIGNATURE BLOCK */}
            <div className="grid grid-cols-2 gap-6 mt-8 text-center text-[11px]">
              <div className="border-t border-slate-300 pt-3">
                <div className="font-bold text-[#09233f]">المرشح | Candidate</div>
                <div className="mt-1 text-xs"><b>الاسم:</b> {offerData.employee_name}</div>
                <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center">
                  {offerData.offer_status === 'موافق' ? (
                    <span className="text-xs font-bold text-green-700">موافق وموقع إلكترونياً ✓</span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">بانتظار الرد والتوقيع</span>
                  )}
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">الحالة: {offerData.offer_status}</div>
              </div>

              <div className="border-t border-slate-300 pt-3">
                <div className="font-bold text-[#09233f]">اعتماد الشركة | For Company</div>
                <div className="mt-1 text-xs"><b>المدير العام / General Manager</b></div>
                <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center">
                  <span className="text-[9px] text-[#b88618] font-black border border-[#b88618] px-2 py-0.5 rounded">
                    ختم الاعتماد الرسمي
                  </span>
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5">معتمد رسمياً</div>
              </div>
            </div>
          </article>
        )}

        {/* TAB CONTENT: LEAVE REQUEST */}
        {activeTab === 'leave' && (
          <div className="bg-white border rounded-2xl p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-[#09233f]">نموذج طلب إجازة</h2>
            <p className="text-slate-500 text-xs mt-1">نموذج مخصص لطلب الإجازات الاعتيادية والمرضية والاضطرارية.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/forms/leave" className="bg-[#09233f] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-opacity-90">
                فتح محرر نموذج الإجازات الكامل
              </Link>
            </div>
          </div>
        )}

        {/* TAB CONTENT: CLEARANCE */}
        {activeTab === 'clearance' && (
          <div className="bg-white border rounded-2xl p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-[#09233f]">نموذج إخلاء طرف</h2>
            <p className="text-slate-500 text-xs mt-1">نموذج تسليم العهد وتصفية مستحقات الموظف عند انتهاء العمل.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/forms/clearance" className="bg-[#09233f] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-opacity-90">
                فتح محرر نموذج إخلاء الطرف الكامل
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
