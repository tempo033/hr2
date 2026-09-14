'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Copy, ExternalLink, MessageCircle, Plus, RefreshCw, UserRoundCheck, Pencil, Trash2, Printer, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Requirement = { id: string; name: string; category: string; weight: number; required: boolean; sort_order: number }
type Candidate = { id: string; request_id: string; share_token: string; full_name: string; phone: string; status: string; degree: string; specialization: string; total_experience_years: number | null; saudi_experience_years: number | null; updated_at: string }
type Score = { candidate_id: string; requirement_id: string; score: number; evidence: string }
const statuses = ['جديد','تم إرسال الرابط','أكمل البيانات','تحت المراجعة','مطابق','مطابق جزئيًا','غير مطابق','مرشح للمقابلة','تم القبول','مرفوض']

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<any>(null)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState('')
  const [copied, setCopied] = useState('')

  const load = async () => {
    if (!supabase || !id) return
    setLoading(true)
    setError('')
    const [{ data: r, error: re }, { data: reqs, error: qe }, { data: cs, error: ce }] = await Promise.all([
      supabase.from('requests').select('*').eq('id', id).single(),
      supabase.from('request_requirements').select('*').eq('request_id', id).order('sort_order'),
      supabase.from('candidates').select('*').eq('request_id', id).order('created_at', { ascending: false })
    ])
    if (re || qe || ce) setError(re?.message || qe?.message || ce?.message || 'تعذر تحميل الطلب.')
    const rows = cs || []
    const { data: ss } = rows.length ? await supabase.from('candidate_requirement_scores').select('*').in('candidate_id', rows.map(x => x.id)) : { data: [] }
    setRequest(r)
    setRequirements(reqs || [])
    setCandidates(rows)
    setScores(ss || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const scoreMap = useMemo(() => {
    const m: Record<string, Record<string, number>> = {}
    scores.forEach(s => { (m[s.candidate_id] ??= {})[s.requirement_id] = s.score })
    return m
  }, [scores])

  const metrics = (cid: string) => {
    const tw = requirements.reduce((s, r) => s + Number(r.weight || 0), 0)
    if (!tw) return { overall: 0, requiredCompliance: 0, strengths: [] as Requirement[], weaknesses: [] as Requirement[], requiredGaps: [] as Requirement[], recommendation: 'لا توجد بيانات كافية' }
    const overall = Math.round(requirements.reduce((s, r) => s + Number(r.weight || 0) * Number(scoreMap[cid]?.[r.id] || 0) / 100, 0) / tw * 100)
    const required = requirements.filter(r => r.required), matched = required.filter(r => Number(scoreMap[cid]?.[r.id] || 0) >= 50), rc = required.length ? Math.round(matched.length / required.length * 100) : 100
    const strengths = requirements.filter(r => Number(scoreMap[cid]?.[r.id] || 0) >= 75), weaknesses = requirements.filter(r => Number(scoreMap[cid]?.[r.id] || 0) < 50), gaps = required.filter(r => Number(scoreMap[cid]?.[r.id] || 0) < 50)
    return { overall, requiredCompliance: rc, strengths, weaknesses, requiredGaps: gaps, recommendation: overall >= 80 && rc === 100 ? 'مرشح قوي' : overall >= 70 && rc >= 75 ? 'مرشح للمقابلة' : overall >= 50 ? 'مراجعة إضافية' : 'غير مناسب' }
  }

  const createCandidate = async () => {
    if (!supabase || !id) return
    setCreating(true)
    setError('')
    const { data, error: e } = await supabase.from('candidates').insert({ request_id: id, full_name: name.trim() || 'مرشح جديد', phone: phone.trim(), status: 'جديد' }).select().single()
    if (e || !data) { setError(e?.message || 'تعذر إضافة المرشح.'); setCreating(false); return }
    const link = `${window.location.origin}/candidate/${data.share_token}`
    setCreatedLink(link)
    setName('')
    setPhone('')
    await load()
    setCreating(false)
  }

  const candidateLink = (t: string) => `${window.location.origin}/candidate/${t}`
  const copy = async (t: string) => {
    const l = candidateLink(t)
    await navigator.clipboard?.writeText(l)
    setCopied(t)
    setTimeout(() => setCopied(''), 1500)
  }

  const whatsapp = (c: Candidate) => {
    const raw = (c.phone || '').replace(/\D/g, '')
    const pn = raw.startsWith('0') ? `966${raw.slice(1)}` : raw
    const text = encodeURIComponent(`مرحباً ${c.full_name}، نرجو تعبئة نموذج بياناتك الوظيفية عبر الرابط التالي: ${candidateLink(c.share_token)}`)
    window.open(`https://wa.me/${pn}?text=${text}`, '_blank')
  }

  const updateStatus = async (cid: string, status: string) => {
    if (!supabase) return
    await supabase.from('candidates').update({ status, updated_at: new Date().toISOString() }).eq('id', cid)
    setCandidates(candidates.map(c => c.id === cid ? { ...c, status } : c))
  }

  const deleteRequest = async () => {
    if (!supabase || !id) return
    if (!confirm('هل أنت متأكد من حذف الطلب وجميع بياناته المرتبطة؟ لا يمكن التراجع عن العملية.')) return
    setError('')
    const { error: e } = await supabase.rpc('delete_hr_request', { p_request_id: id })
    if (e) { setError(`تعذر حذف الطلب: ${e.message}`); return }
    window.location.href = '/requests'
  }

  if (!supabase) return <main className="min-h-screen grid place-items-center p-6">لم يتم إعداد Supabase.</main>
  if (loading) return <main className="min-h-screen grid place-items-center">جاري تحميل الطلب...</main>

  return (
    <main className="min-h-screen bg-[#f5f7fa]" dir="rtl">
      <header className="bg-[#09233f] text-white px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[#d4a72c] font-bold">البنية الاساسية للمقاولات</div>
            <h1 className="text-2xl font-black mt-1">{request?.exact_type || 'طلب وظيفي'}</h1>
            <p className="text-slate-300 text-sm mt-1">{request?.request_type} • {request?.department || 'بدون قسم'} • {request?.status}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Link
              href={`/reports/request/${id}`}
              className="bg-[#b88618] hover:bg-[#a57714] text-white rounded-xl px-4 py-2 font-bold flex items-center gap-2 text-sm shadow transition"
            >
              <Printer size={16} /> تقرير الطلب PDF
            </Link>
            <Link href={`/requests/${id}/edit`} className="border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2 text-sm hover:bg-white/10">
              <Pencil size={16} /> تعديل
            </Link>
            <button onClick={deleteRequest} className="border border-red-300/40 text-red-200 rounded-xl px-4 py-2 flex items-center gap-2 text-sm hover:bg-red-500/20">
              <Trash2 size={16} /> حذف
            </button>
            <Link href="/requests" className="border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2 text-sm hover:bg-white/10">
              <ArrowRight size={17} /> الطلبات
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-5 md:p-8">
        {error && <div className="mb-5 bg-red-50 text-red-700 p-4 rounded-xl">{error}</div>}

        <section className="grid lg:grid-cols-[1.4fr_.6fr] gap-5 mb-6">
          <div className="card p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="section-title mb-0">متطلبات ومعايير الطلب</h2>
                <p className="text-xs text-slate-500 mt-0.5">المعايير المحددة التي يتم بناء عليها تقييم المرشحين</p>
              </div>
              <button onClick={load} className="text-slate-500 hover:text-slate-700 p-2"><RefreshCw size={18} /></button>
            </div>

            <div className="grid md:grid-cols-2 gap-3 mt-5">
              {requirements.map(r => (
                <div key={r.id} className={`border rounded-xl p-4 ${r.required ? 'border-[#b88618] bg-amber-50/40' : 'bg-slate-50/50'}`}>
                  <div className="flex justify-between gap-3">
                    <b>{r.name}</b>
                    <span className="text-[#b88618] font-bold">{Number(r.weight)}%</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{r.category} {r.required ? '• متطلب أساسي' : ''}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-bold flex justify-between border">
              <span>إجمالي أوزان المتطلبات</span>
              <span>{requirements.reduce((s, r) => s + Number(r.weight || 0), 0).toFixed(2)}%</span>
            </div>
          </div>

          <div className="card p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="section-title">إضافة مرشح جديد</h2>
            <p className="text-xs text-slate-500 mb-3">إنشاء رابط مباشر يرسل للمرشح لتعبئة بياناته وسيرته الذاتية</p>
            <input className="input mb-3 w-full border rounded-xl p-3 text-sm" placeholder="اسم المرشح الكامل" value={name} onChange={e => setName(e.target.value)} />
            <input className="input mb-3 w-full border rounded-xl p-3 text-sm" placeholder="رقم الجوال (05xxxxxxxx)" value={phone} onChange={e => setPhone(e.target.value)} />
            <button onClick={createCandidate} disabled={creating} className="btn-gold w-full rounded-xl py-3 font-bold flex justify-center gap-2 bg-[#b88618] text-white hover:bg-[#a57714]">
              {creating ? 'جاري الإضافة...' : <><Plus size={18} /> إنشاء رابط مرشح</>}
            </button>
            {createdLink && (
              <div className="mt-4 bg-green-50 text-green-700 rounded-xl p-3 text-sm break-all border border-green-200">
                <div className="font-bold mb-2">تم إنشاء الرابط بنجاح:</div>
                {createdLink}
                <button onClick={() => navigator.clipboard?.writeText(createdLink)} className="mt-2 text-xs font-bold underline block">
                  نسخ الرابط للحافظة
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="card p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="section-title mb-1">المرشحون للوظيفة</h2>
              <p className="text-sm text-slate-500">تحليل تلقائي لمدى التوافق حسب أوزان المتطلبات والمتطلبات الأساسية، مع إمكانية التقييم وتصدير التقارير.</p>
            </div>
            <div className="font-bold text-[#09233f] text-sm bg-slate-100 px-3 py-1.5 rounded-xl">{candidates.length} مرشح</div>
          </div>

          {!candidates.length ? (
            <div className="py-12 text-center text-slate-500">لم تتم إضافة مرشحين بعد في هذا الطلب.</div>
          ) : (
            <div className="space-y-4">
              {candidates.map(c => {
                const m = metrics(c.id)
                return (
                  <div key={c.id} className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition bg-white">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <UserRoundCheck size={20} className="text-[#b88618]" />
                          <h3 className="font-black text-lg text-[#09233f]">{c.full_name}</h3>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {c.phone || 'بدون جوال'} {c.specialization ? `• ${c.specialization}` : ''} {c.total_experience_years != null ? `• ${c.total_experience_years} سنة خبرة` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`text-2xl font-black ${m.overall >= 75 ? 'text-green-600' : m.overall >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {m.overall}%
                        </div>
                        <select
                          value={c.status}
                          onChange={e => updateStatus(c.id, e.target.value)}
                          className="border rounded-xl px-3 py-2 text-sm bg-white font-bold text-slate-700"
                        >
                          <option value="">الحالة</option>
                          {statuses.map(s => <option key={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#b88618]" style={{ width: `${m.overall}%` }} />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        نسبة التوافق <b className="block text-lg mt-0.5">{m.overall}%</b>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        مطابقة المتطلبات الأساسية <b className="block text-lg mt-0.5">{m.requiredCompliance}%</b>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                        التوصية الأولية <b className="block text-lg text-[#09233f] mt-0.5">{m.recommendation}</b>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <b className="text-green-700">نقاط القوة:</b>
                        <div className="mt-1 text-slate-600">{m.strengths.map(r => r.name).join('، ') || 'لم يتم تسجيل نقاط قوية بعد'}</div>
                      </div>
                      <div>
                        <b className="text-red-700">الفجوات:</b>
                        <div className="mt-1 text-slate-600">
                          {m.requiredGaps.length ? `متطلبات أساسية: ${m.requiredGaps.map(r => r.name).join('، ')}` : (m.weaknesses.length ? m.weaknesses.map(r => r.name).join('، ') : 'لا توجد فجوات مسجلة')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
                      <Link
                        href={`/requests/${id}/candidates/${c.id}`}
                        className="bg-[#09233f] hover:bg-[#123864] text-white rounded-xl px-4 py-2 font-bold text-sm"
                      >
                        التقييم الهرمي والمقابلة
                      </Link>
                      <Link
                        href={`/reports/candidate/${c.id}`}
                        className="border border-slate-300 hover:bg-slate-50 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-1.5 text-slate-700"
                      >
                        <Printer size={15} /> تقرير المرشح PDF
                      </Link>
                      <Link
                        href={`/reports/evaluation/${c.id}`}
                        className="border border-slate-300 hover:bg-slate-50 rounded-xl px-4 py-2 font-bold text-sm flex items-center gap-1.5 text-slate-700"
                      >
                        <Printer size={15} /> تقرير التقييم PDF
                      </Link>
                      <button onClick={() => copy(c.share_token)} className="border border-slate-300 rounded-xl px-4 py-2 font-bold text-sm flex gap-2 items-center hover:bg-slate-50">
                        <Copy size={16} />{copied === c.share_token ? 'تم النسخ' : 'نسخ رابط المرشح'}
                      </button>
                      <button onClick={() => whatsapp(c)} disabled={!c.phone} className="border border-slate-300 rounded-xl px-4 py-2 font-bold text-sm flex gap-2 items-center disabled:opacity-40 hover:bg-slate-50">
                        <MessageCircle size={16} /> إرسال واتساب
                      </button>
                      <a href={candidateLink(c.share_token)} target="_blank" rel="noreferrer" className="border border-slate-300 rounded-xl px-4 py-2 font-bold text-sm flex gap-2 items-center hover:bg-slate-50">
                        <ExternalLink size={16} /> فتح النموذج
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
