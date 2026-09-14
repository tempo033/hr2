'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Printer, Users, CheckCircle2, ClipboardList, Briefcase } from 'lucide-react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RequestSummaryPdfReport() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<any>(null)
  const [requirements, setRequirements] = useState<any[]>([])
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [{ data: r }, { data: reqs }, { data: cands }] = await Promise.all([
        supabase.from('requests').select('*').eq('id', id).single(),
        supabase.from('request_requirements').select('*').eq('request_id', id).order('sort_order'),
        supabase.from('candidates').select('*').eq('request_id', id).order('created_at', { ascending: false })
      ])
      setRequest(r)
      setRequirements(reqs || [])
      setCandidates(cands || [])
      setLoading(false)
    })()
  }, [id])

  if (loading) return <main dir="rtl" className="min-h-screen grid place-items-center font-bold text-[#09233f]">جاري تجهيز تقرير الطلب الرسمي...</main>
  if (!request) return <main dir="rtl" className="min-h-screen grid place-items-center">الطلب غير موجود.</main>

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
        <Link href={`/requests/${id}`} className="flex items-center gap-2 text-[#09233f] font-bold hover:underline">
          <ArrowRight size={18} /> العودة للطلب
        </Link>
        <button
          onClick={() => window.print()}
          className="bg-[#09233f] hover:bg-[#123864] text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2 shadow"
        >
          <Printer size={18} /> طباعة / تصدير تقرير الطلب PDF
        </button>
      </div>

      <article className="paper max-w-[850px] mx-auto bg-white shadow-xl rounded-xl p-8 md:p-12 text-[12px] leading-relaxed">
        {/* HEADER */}
        <header className="border-b-2 border-[#09233f] pb-4 flex justify-between items-center">
          <div>
            <div className="text-xl font-black text-[#09233f]">شركة البنية الأساسية للمقاولات ذ.م.م</div>
            <div className="text-[#b88618] font-bold text-xs">إدارة الموارد البشرية • تقرير حالة وتدقيق الطلب</div>
            <div className="text-[11px] text-slate-500 mt-0.5">تقرير تفصيلي شامل للطلب الوظيفي</div>
          </div>
          <div className="text-left" dir="ltr">
            <div className="text-xs font-mono font-bold text-[#09233f]">REQ: {request.id.slice(0, 8).toUpperCase()}</div>
            <div className="text-[11px] text-slate-500">Date: {reportDate}</div>
            <div className="mt-1 px-2.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-center inline-block">OFFICIAL AUDIT</div>
          </div>
        </header>

        <div className="text-center my-4">
          <h1 className="text-2xl font-black text-[#09233f]">تقرير شامل للطلب ومسار الترشيحات</h1>
          <div className="text-xs text-[#b88618] font-bold">RECRUITMENT REQUISITION & CANDIDATES REPORT</div>
        </div>

        {/* BASIC REQUEST INFO */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
          <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
            <span>بيانات الطلب الأساسية</span>
            <span dir="ltr">REQUISITION METADATA</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2 bg-slate-50 text-[11.5px]">
            <div><b>المسمى الوظيفي المطلوب:</b> {request.exact_type || '—'}</div>
            <div><b>نوع الطلب:</b> {request.request_type || '—'}</div>
            <div><b>القسم / الإدارة الطالبة:</b> {request.department || '—'}</div>
            <div><b>المشروع / الموقع:</b> {request.project_name || '—'}</div>
            <div><b>عدد الوظائف المطلوبة:</b> {request.count || 1}</div>
            <div><b>حالة الطلب:</b> <span className="font-bold text-[#09233f]">{request.status || 'نشط'}</span></div>
            <div><b>تاريخ الإنشاء:</b> {new Date(request.created_at).toLocaleDateString('ar-SA')}</div>
            <div><b>عدد المرشحين المسجلين:</b> {candidates.length} مرشح</div>
          </div>
        </div>

        {/* JOB REQUIREMENTS */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
          <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
            <span>متطلبات ومعايير الوظيفة المعتمدة ({requirements.length} معيار)</span>
            <span dir="ltr">ROLE REQUIREMENTS & CRITERIA</span>
          </div>
          <div className="p-3">
            {requirements.length > 0 ? (
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-1.5 font-bold">م</th>
                    <th className="p-1.5 font-bold">المعيار / المتطلب</th>
                    <th className="p-1.5 font-bold text-center">التصنيف</th>
                    <th className="p-1.5 font-bold text-center">النوع</th>
                    <th className="p-1.5 font-bold text-center">الوزن النسبي</th>
                  </tr>
                </thead>
                <tbody>
                  {requirements.map((req, idx) => (
                    <tr key={req.id} className="border-b">
                      <td className="p-1.5 text-slate-500">{idx + 1}</td>
                      <td className="p-1.5 font-medium">{req.name}</td>
                      <td className="p-1.5 text-center text-slate-500">{req.category || 'عام'}</td>
                      <td className="p-1.5 text-center">{req.required ? <span className="text-red-700 font-bold">أساسي</span> : 'إضافي'}</td>
                      <td className="p-1.5 text-center font-bold">{req.weight}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-500 text-xs">لا توجد متطلبات مسجلة لهذا الطلب.</p>
            )}
          </div>
        </div>

        {/* CANDIDATES TABLE */}
        <div className="border border-slate-300 rounded-lg overflow-hidden mt-4">
          <div className="bg-[#09233f] text-white px-3 py-1.5 font-bold text-xs flex justify-between">
            <span>قائمة المرشحين وحالات التقييم ({candidates.length} مرشح)</span>
            <span dir="ltr">CANDIDATES PIPELINE</span>
          </div>
          <div className="p-3">
            {candidates.length > 0 ? (
              <table className="w-full text-right border-collapse text-[11px]">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-1.5 font-bold">اسم المرشح</th>
                    <th className="p-1.5 font-bold">الجوال</th>
                    <th className="p-1.5 font-bold">المؤهل / التخصص</th>
                    <th className="p-1.5 font-bold text-center">سنوات الخبرة</th>
                    <th className="p-1.5 font-bold text-center">حالة الترشيح</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(c => (
                    <tr key={c.id} className="border-b">
                      <td className="p-1.5 font-bold text-[#09233f]">{c.full_name}</td>
                      <td className="p-1.5">{c.phone || '—'}</td>
                      <td className="p-1.5">{c.degree || ''} {c.specialization ? `• ${c.specialization}` : ''}</td>
                      <td className="p-1.5 text-center">{c.total_experience_years ?? '—'} سنة</td>
                      <td className="p-1.5 text-center font-bold">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px]">
                          {c.stage || 'تحت الإجراء'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-500 text-xs">لا يوجد مرشحون مسجلون في هذا الطلب حتى الآن.</p>
            )}
          </div>
        </div>

        {/* SIGNATURE BLOCK */}
        <div className="mt-8 border-t-2 border-slate-300 pt-4 grid grid-cols-2 gap-8 text-center text-[11px]">
          <div>
            <div className="font-bold text-[#09233f]">إعداد مسؤول التوظيف</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1" />
            <div className="text-slate-400 text-[10px] mt-1">الاسم / التوقيع</div>
          </div>
          <div>
            <div className="font-bold text-[#09233f]">اعتماد مدير الموارد البشرية</div>
            <div className="h-10 border-b border-dotted border-slate-400 mt-1 flex items-center justify-center">
              <span className="text-[10px] text-[#b88618] font-black border border-[#b88618] px-2 py-0.5 rounded">
                معتمد رسمياً
              </span>
            </div>
            <div className="text-slate-400 text-[10px] mt-1">التوقيع والختم</div>
          </div>
        </div>
      </article>
    </main>
  )
}
