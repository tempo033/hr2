'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Printer, FileText, CheckCircle2, ShieldCheck, Building2, Users } from 'lucide-react'
import { useParams } from 'next/navigation'

export default function CandidatePdfReport() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const [candidate, setCandidate] = useState<any>(null)
  const [request, setRequest] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [interviews, setInterviews] = useState<any[]>([])
  const [approval, setApproval] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/reports/candidate/' + candidateId, { cache: 'no-store' })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'تعذر تحميل التقرير الشامل')
        setCandidate(body.candidate || null)
        setRequest(body.request || null)
        setRequirements(body.requirements || [])
        setScores(body.scores || [])
        setInterviews(body.interviews || [])
        setApproval(body.approval || null)
      } catch {
        setCandidate(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [candidateId])

  if (loading) return <main dir="rtl" className="min-h-screen grid place-items-center font-bold text-[#09233f]">جاري تجهيز التقرير الشامل...</main>
  if (!candidate) return <main dir="rtl" className="min-h-screen grid place-items-center">المرشح غير موجود.</main>

  const scoreMap = Object.fromEntries(scores.map(s => [s.requirement_id, s]))
  const totalWeight = requirements.reduce((s, r) => s + Number(r.weight || 0), 0)
  const overall = totalWeight ? Math.round(requirements.reduce((s, r) => s + Number(r.weight || 0) * Number(scoreMap[r.id]?.score || 0) / 100, 0) / totalWeight * 100) : 0
  const latestInterview = interviews[0]
  const reportDate = new Date().toLocaleDateString('ar-SA')

  return (
    <main dir="rtl" className="min-h-screen bg-slate-200 py-6 text-slate-800">
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          .paper { box-shadow: none !important; max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="no-print max-w-[850px] mx-auto mb-4 flex justify-between items-center px-2">
        <Link href={`/requests/${candidate.request_id}`} className="flex items-center gap-2 text-[#09233f] font-bold hover:underline">
          <ArrowRight size={18} /> العودة للمرشح
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-[#09233f] hover:bg-[#123864] text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2 shadow"
        >
          <Printer size={18} /> طباعة / تصدير PDF رسمي
        </button>
      </div>

      <article className="paper max-w-[850px] mx-auto bg-white shadow-xl rounded-xl p-8 md:p-12 text-[12px] leading-relaxed">
        {/* OFFICIAL HEADER */}
        <header className="border-b-2 border-[#09233f] pb-4 flex justify-between items-center">
          <div>
            <div className="text-xl font-black text-[#09233f]">شركة البنية الأساسية للمقاولات ذ.م.م</div>
            <div className="text-[#b88618] font-bold text-xs">إدارة الموارد البشرية والتوظيف الموحد</div>
            <div className="text-[11px] text-slate-500 mt-1">المملكة العربية السعودية • تقرير شامل لتقييم المرشح</div>
          </div>
          <div className="text-left" dir="ltr">
            <div className="text-xs font-mono font-bold text-[#09233f]">REF: CR-{candidate.id.slice(0, 8).toUpperCase()}</div>
            <div className="text-[11px] text-slate-500">Date: {reportDate}</div>
            <div className="mt-1 px-2.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-center inline-block">CONFIDENTIAL</div>
          </div>
        </header>

        <div className="text-center my-4">
          <h1 className="text-2xl font-black text-[#09233f]">الملف الشامل وتقييم المرشح</h1>
          <div className="text-xs text-[#b88618] font-bold">CANDIDATE COMPREHENSIVE DOSSIER & PROFILE</div>
        </div>

        {/* SECTION 1: CANDIDATE INFO */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
          <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
            <span>أولاً: البيانات الشخصية والمهنية للمرشح</span>
            <span dir="ltr">PERSONAL & PROFESSIONAL PROFILE</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-y-2 gap-x-4 bg-slate-50/50 text-[11.5px]">
            <div><span className="font-bold text-[#09233f]">الاسم الكامل:</span> {candidate.full_name}</div>
            <div><span className="font-bold text-[#09233f]">المسمى المتقدم له:</span> {request?.exact_type || '—'}</div>
            <div><span className="font-bold text-[#09233f]">رقم الجوال:</span> {candidate.phone || '—'}</div>
            <div><span className="font-bold text-[#09233f]">البريد الإلكتروني:</span> {candidate.email || '—'}</div>
            <div><span className="font-bold text-[#09233f]">الجنسية:</span> {candidate.nationality || '—'}</div>
            <div><span className="font-bold text-[#09233f]">رقم الهوية / الإقامة:</span> {candidate.national_id || '—'}</div>
            <div><span className="font-bold text-[#09233f]">المؤهل العلمي:</span> {candidate.degree || '—'}</div>
            <div><span className="font-bold text-[#09233f]">التخصص:</span> {candidate.specialization || '—'}</div>
            <div><span className="font-bold text-[#09233f]">إجمالي سنوات الخبرة:</span> {candidate.total_experience_years ?? '—'} سنة</div>
            <div><span className="font-bold text-[#09233f]">الخبرة داخل السعودية:</span> {candidate.saudi_experience_years ?? '—'} سنة</div>
          </div>
        </div>

        {/* SECTION 2: MATCHING & REQUIREMENTS ANALYSIS */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
          <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
            <span>ثانيًا: تحليل مطابقة المتطلبات الوظيفية والمعايير الأساسية</span>
            <span dir="ltr">JOB REQUIREMENTS MATCHING</span>
          </div>
          <div className="p-3">
            <div className="flex justify-between items-center bg-slate-100 p-2 rounded mb-3 text-xs">
              <span className="font-bold text-[#09233f]">نسبة التوافق الإجمالية للمتطلبات:</span>
              <span className="text-base font-black text-[#09233f]">{overall}%</span>
            </div>
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-1.5 font-bold">المعيار / المتطلب</th>
                  <th className="p-1.5 font-bold text-center">النوع</th>
                  <th className="p-1.5 font-bold text-center">الوزن</th>
                  <th className="p-1.5 font-bold text-center">درجة المطابقة</th>
                  <th className="p-1.5 font-bold">دليل المطابقة من السيرة</th>
                </tr>
              </thead>
              <tbody>
                {requirements.map(req => {
                  const sc = scoreMap[req.id]?.score || 0
                  return (
                    <tr key={req.id} className="border-b">
                      <td className="p-1.5 font-medium">{req.name}</td>
                      <td className="p-1.5 text-center">{req.required ? <span className="text-red-700 font-bold">أساسي</span> : 'إضافي'}</td>
                      <td className="p-1.5 text-center">{req.weight}%</td>
                      <td className="p-1.5 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${sc >= 75 ? 'bg-green-100 text-green-800' : sc >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                          {sc}%
                        </span>
                      </td>
                      <td className="p-1.5 text-slate-500">{scoreMap[req.id]?.evidence || 'مطابق للبيانات'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: HIERARCHICAL EVALUATION OUTCOME */}
        {latestInterview && (
          <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
            <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
              <span>ثالثًا: نتيجة التقييم المتسلسل والمقابلة</span>
              <span dir="ltr">HIERARCHICAL EVALUATION</span>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
                <div className="border p-2 rounded bg-slate-50">
                  <div className="text-slate-500 text-[10px]">1. الموارد البشرية (30%)</div>
                  <div className="text-base font-black text-[#09233f] mt-0.5">{latestInterview.hr_score}%</div>
                </div>
                <div className="border p-2 rounded bg-slate-50">
                  <div className="text-slate-500 text-[10px]">2. الإدارة المختصة (35%)</div>
                  <div className="text-base font-black text-[#09233f] mt-0.5">{latestInterview.engineering_score}%</div>
                </div>
                <div className="border p-2 rounded bg-slate-50">
                  <div className="text-slate-500 text-[10px]">3. الإدارة التنفيذية (35%)</div>
                  <div className="text-base font-black text-[#09233f] mt-0.5">{latestInterview.technical_office_score}%</div>
                </div>
                <div className="border p-2 rounded bg-[#09233f] text-white">
                  <div className="text-slate-300 text-[10px]">النتيجة الموزونة</div>
                  <div className="text-base font-black mt-0.5">{latestInterview.final_score}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-2.5 rounded border">
                <div><b>التوصية النهائية:</b> {latestInterview.recommendation || '—'}</div>
                <div><b>القرار المسجل:</b> <span className="font-bold text-[#09233f]">{latestInterview.final_decision || '—'}</span></div>
              </div>

              {latestInterview.general_notes && (
                <div className="mt-2 text-[11px] text-slate-600 bg-white p-2 border rounded">
                  <b>ملاحظات التقييم الإداري:</b> {latestInterview.general_notes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 4: OFFER STATUS */}
        {approval && (
          <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
            <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
              <span>رابعًا: حالة العرض الوظيفي والموافقة</span>
              <span dir="ltr">JOB OFFER STATUS</span>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2 text-[11px] bg-slate-50">
              <div><b>الراتب الشهري:</b> {approval.salary ? `${approval.salary} ر.س` : '—'}</div>
              <div><b>حالة الرد:</b> <span className="font-bold text-[#09233f]">{approval.offer_status || 'بانتظار الرد'}</span></div>
              <div><b>تاريخ الرد:</b> {approval.offer_responded_at ? new Date(approval.offer_responded_at).toLocaleDateString('ar-SA') : '—'}</div>
            </div>
          </div>
        )}

        {/* OFFICIAL SIGNATURE BLOCK */}
        <div className="mt-8 border-t-2 border-slate-300 pt-4 grid grid-cols-3 gap-4 text-center text-[11px]">
          <div>
            <div className="font-bold text-[#09233f]">مسؤول الموارد البشرية</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1" />
            <div className="text-slate-400 text-[10px] mt-1">الاسم والاعتماد</div>
          </div>
          <div>
            <div className="font-bold text-[#09233f]">مدير الإدارة المختصة</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1" />
            <div className="text-slate-400 text-[10px] mt-1">الاسم والاعتماد</div>
          </div>
          <div>
            <div className="font-bold text-[#09233f]">اعتماد المدير العام</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center">
              {latestInterview?.final_decision === 'قبول' && (
                <span className="text-[10px] text-[#b88618] font-black border border-[#b88618] px-2 py-0.5 rounded">
                  معتمد رسمياً
                </span>
              )}
            </div>
            <div className="text-slate-400 text-[10px] mt-1">التوقيع والختم الرسمي</div>
          </div>
        </div>
      </article>
    </main>
  )
}
