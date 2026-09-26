'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Calculator, Download, Plus, Printer, RefreshCw, Save, ShieldCheck } from 'lucide-react'
import * as XLSX from 'xlsx'

type Mode = 'dashboard' | 'calculator' | 'company' | 'employees' | 'simulation' | 'rules' | 'history' | 'reports' | 'settings'

const bands = ['منخفض الأخضر', 'متوسط الأخضر', 'مرتفع الأخضر', 'البلاتيني']

function Card({ title, value }: { title: string; value: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-3xl font-black text-[#09233f] mt-2">{value}</div>
    </div>
  )
}

function Shell({ children }: { children: ReactNode }) {
  const links = [
    ['/nitaqat', 'لوحة نطاقات'],
    ['/nitaqat/calculator', 'حاسبة نطاقات'],
    ['/nitaqat/company', 'بيانات المنشأة'],
    ['/nitaqat/employees', 'الموظفون المحتسبون'],
    ['/nitaqat/simulation', 'محاكاة التوطين'],
    ['/nitaqat/rules', 'متطلبات النطاق'],
    ['/nitaqat/history', 'سجل التغييرات'],
    ['/nitaqat/reports', 'التقارير'],
    ['/nitaqat/settings', 'إعدادات نطاقات'],
  ]
  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f7fa]">
      <div className="max-w-7xl mx-auto p-5 md:p-8">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-[#b88618] font-bold">وحدة التوطين داخل HR2</div>
            <h1 className="text-3xl font-black text-[#09233f]">نطاقات</h1>
          </div>
          <Link href="/" className="font-bold text-[#09233f]">الرئيسية</Link>
        </header>
        <nav className="flex gap-2 overflow-auto pb-2 mb-6">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 bg-white border rounded-xl px-4 py-2.5 font-bold text-slate-700">
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  )
}

export default function NitaqatPage({ mode }: { mode: Mode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>({})
  const [activity, setActivity] = useState('')
  const [year, setYear] = useState(2026)
  const [saudi, setSaudi] = useState(0)
  const [nonSaudi, setNonSaudi] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [targetBand, setTargetBand] = useState('مرتفع الأخضر')
  const [scenarioName, setScenarioName] = useState('')
  const [officialBand, setOfficialBand] = useState('')
  const [officialNotes, setOfficialNotes] = useState('')
  const [editingRule, setEditingRule] = useState<any>(null)
  const [ruleForm, setRuleForm] = useState<any>({
    activity_group: '',
    m_values: { 'منخفض الأخضر': 0, 'متوسط الأخضر': 0, 'مرتفع الأخضر': 0, 'البلاتيني': 0 },
    targets: {
      'منخفض الأخضر': { '2026': 0 },
      'متوسط الأخضر': { '2026': 0 },
      'مرتفع الأخضر': { '2026': 0 },
      'البلاتيني': { '2026': 0 },
    },
    effective_from: '2026-01-01',
    source_title: '',
    source_url: '',
    decision_no: '',
    active: true,
  })
  const [company, setCompany] = useState<any>({
    company_name: 'شركة البنية الأساسية للمقاولات',
    entity_number: '',
    entity_name: '',
    main_activity: '',
    sub_activity: '',
    active_statuses: ['خارج الكفالة فعال', 'على الكفالة'],
    current_year: 2026,
  })

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const action =
        mode === 'employees' ? 'employees' :
        mode === 'rules' || mode === 'settings' ? 'rules' :
        mode === 'history' ? 'history' :
        mode === 'company' ? 'settings' :
        'summary'
      const response = await fetch('/api/nitaqat?action=' + action, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'تعذر التحميل')
      setData(body)
      if (body.settings) {
        setCompany(body.settings)
        setActivity(body.settings.main_activity || '')
        setYear(Number(body.settings.current_year || 2026))
      }
      if (body.summary) {
        setSaudi(Number(body.summary.saudi || 0))
        setNonSaudi(Number(body.summary.nonSaudi || 0))
        setResult(body.summary)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر التحميل')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [mode])

  const rules = data.rules || []
  const employees = data.employees || []
  const activities = useMemo(() => Array.from(new Set(rules.filter((r: any) => r.active !== false).map((r: any) => r.activity_group))).filter(Boolean) as string[], [rules])

  const save = async (action: string, payload: any) => {
    const response = await fetch('/api/nitaqat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'تعذر الحفظ')
    return body
  }

  const calculate = async () => {
    const response = await fetch('/api/nitaqat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calculate', activity, total: saudi + nonSaudi, saudi, nonSaudi, year, targetBand }),
    })
    const body = await response.json()
    if (!response.ok) {
      alert(body.error || 'تعذر الحساب')
      return
    }
    setResult({ ...body.result, required_saudi_for_target: body.required_saudi_for_target })
  }

  const useCurrent = () => {
    setSaudi(Number(data.summary?.saudi || 0))
    setNonSaudi(Number(data.summary?.nonSaudi || 0))
    setActivity(company.main_activity || data.settings?.main_activity || '')
  }

  const saveCompany = async () => {
    try {
      await save('save_settings', { settings: company })
      alert('تم حفظ بيانات المنشأة')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر الحفظ')
    }
  }

  const saveSnapshot = async () => {
    try {
      await save('save_history', {
        snapshot_date: new Date().toISOString().slice(0, 10),
        saudi_count: data.summary?.saudi || 0,
        non_saudi_count: data.summary?.nonSaudi || 0,
        total_count: data.summary?.total || 0,
        localization_rate: data.summary?.localizationRate,
        activity_group: data.settings?.main_activity || null,
        sub_activity: data.settings?.sub_activity || null,
        estimated_band: data.summary?.band || null,
        official_band: data.summary?.official_band || null,
        notes: 'لقطة محفوظة من لوحة نطاقات',
      })
      alert('تم حفظ اللقطة')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر الحفظ')
    }
  }

  const saveRule = async () => {
    try {
      await save('save_rule', { rule: { ...ruleForm, id: editingRule?.id || undefined } })
      alert('تم حفظ قاعدة نطاقات')
      setEditingRule(null)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر حفظ القاعدة')
    }
  }

  const saveOfficial = async () => {
    try {
      await save('save_official', { official_band: officialBand, notes: officialNotes })
      alert('تم تسجيل النطاق الرسمي')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر الحفظ')
    }
  }

  const saveScenario = async () => {
    try {
      await save('save_scenario', {
        name: scenarioName || 'سيناريو توطين',
        activity,
        saudi,
        nonSaudi,
        base_saudi: data.summary?.saudi || 0,
        base_non_saudi: data.summary?.nonSaudi || 0,
        year,
      })
      alert('تم حفظ السيناريو')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر الحفظ')
    }
  }

  const exportRows = (rows: any[]) => {
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'نطاقات')
    XLSX.writeFile(workbook, 'nitaqat-report.xlsx')
  }

  const exportDetailed = async (action: string) => {
    try {
      const response = await fetch('/api/nitaqat?action=' + action, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'تعذر التصدير')
      exportRows(body.employees || body.rows || body.audit || [])
    } catch (e) {
      alert(e instanceof Error ? e.message : 'تعذر التصدير')
    }
  }

  if (loading) return <Shell><div className="p-12 text-center">جاري تحميل بيانات نطاقات...</div></Shell>

  if (error) {
    return (
      <Shell>
        <div className="bg-red-50 text-red-700 rounded-xl p-5">
          {error}
          <button onClick={() => void load()} className="mr-3 underline">إعادة المحاولة</button>
        </div>
      </Shell>
    )
  }

  if (mode === 'dashboard' || mode === 'reports') {
    return (
      <Shell>
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card title="السعوديون" value={data.summary?.saudi ?? 0} />
          <Card title="غير السعوديين" value={data.summary?.nonSaudi ?? 0} />
          <Card title="إجمالي العمالة" value={data.summary?.total ?? 0} />
          <Card title="نسبة التوطين" value={data.summary?.localizationRate == null ? 'غير متاح' : data.summary.localizationRate.toFixed(2) + '%'} />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <section className="bg-white rounded-2xl border p-6 lg:col-span-2">
            <div className="flex justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">النطاق التقديري</div>
                <div className="text-4xl font-black text-[#09233f] mt-2">{data.summary?.band || 'غير متاح'}</div>
                <p className="text-sm text-slate-500 mt-2">النتيجة داخل HR2 تقديرية وليست بديلًا عن النطاق الرسمي في قوى.</p>
              </div>
              <Calculator className="text-[#b88618]" size={36} />
            </div>
          </section>
          <section className="bg-white rounded-2xl border p-6">
            <h3 className="font-black text-[#09233f]">بيانات المنشأة</h3>
            <div className="space-y-2 mt-4 text-sm">
              <div>المنشأة: {data.settings?.company_name || 'غير محدد'}</div>
              <div>النشاط: {data.settings?.main_activity || 'غير محدد'}</div>
              <div>الكيان: {data.settings?.entity_name || 'غير محدد'}</div>
              <div>النطاق الرسمي في قوى: {data.summary?.official_band || 'غير مسجل'}</div>
            </div>
          </section>
        </div>

        {mode === 'dashboard' ? (
          <button onClick={() => void saveSnapshot()} className="mt-5 bg-[#09233f] text-white rounded-xl px-4 py-2 font-bold inline-flex gap-2">
            <Save size={17} /> حفظ لقطة في السجل
          </button>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => void exportDetailed('employees')} className="rounded-xl border px-4 py-2 font-bold">Excel الموظفين</button>
            <button onClick={() => void exportDetailed('history')} className="rounded-xl border px-4 py-2 font-bold">Excel التاريخ</button>
            <button onClick={() => void exportDetailed('scenarios')} className="rounded-xl border px-4 py-2 font-bold">Excel المحاكاة</button>
            <button onClick={() => exportRows([{ السعوديون: data.summary?.saudi, غير_السعوديين: data.summary?.nonSaudi, الإجمالي: data.summary?.total, نسبة_التوطين: data.summary?.localizationRate, النطاق_التقديري: data.summary?.band, النطاق_الرسمي: data.summary?.official_band }])} className="bg-[#b88618] text-white rounded-xl px-4 py-2 font-bold inline-flex gap-2">
              <Download size={17} /> Excel
            </button>
            <button onClick={() => window.print()} className="rounded-xl border px-4 py-2 font-bold inline-flex gap-2">
              <Printer size={17} /> PDF / طباعة
            </button>
          </div>
        )}
      </Shell>
    )
  }

  if (mode === 'calculator' || mode === 'simulation') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border p-6">
          <div className="grid md:grid-cols-5 gap-4">
            <label className="font-bold md:col-span-2">النشاط
              <select value={activity} onChange={(e) => setActivity(e.target.value)} className="mt-2 w-full border rounded-xl p-3">
                <option value="">اختر النشاط الاقتصادي من القائمة المعتمدة</option>
                {activities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="font-bold">السنة
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="mt-2 w-full border rounded-xl p-3">
                <option value={2026}>2026</option><option value={2027}>2027</option><option value={2028}>2028</option>
              </select>
            </label>
            <label className="font-bold">السعوديون
              <input type="number" min="0" value={saudi} onChange={(e) => setSaudi(Number(e.target.value))} className="mt-2 w-full border rounded-xl p-3" />
            </label>
            <label className="font-bold">غير السعوديين
              <input type="number" min="0" value={nonSaudi} onChange={(e) => setNonSaudi(Number(e.target.value))} className="mt-2 w-full border rounded-xl p-3" />
            </label>
          </div>

          <div className="mt-4">
            <label className="font-bold">النطاق المستهدف</label>
            <select value={targetBand} onChange={(e) => setTargetBand(e.target.value)} className="mt-2 w-full md:w-72 border rounded-xl p-3">
              {bands.map((band) => <option key={band} value={band}>{band}</option>)}
            </select>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">الحاسبة تعتمد فقط على الموظفين المحتسبين داخل HR2، ويتم استبعاد أي موظف <b>خارج كفالة المنشأة</b> تلقائيًا. النشاط لا يُدخل يدويًا؛ يجب اختياره من قائمة الأنشطة الاقتصادية المحملة في قواعد نطاقات بالنظام.</div>

          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={useCurrent} className="rounded-xl border px-4 py-2 font-bold">استخدام بيانات الموظفين الحالية</button>
            <button onClick={() => void calculate()} className="bg-[#09233f] text-white rounded-xl px-5 py-2 font-bold inline-flex gap-2"><Calculator size={17} /> احسب النطاق</button>
          </div>

          {mode === 'simulation' && (
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setSaudi((v) => v + 1)} className="border rounded-xl px-3 py-2 font-bold">+ سعودي</button>
              <button onClick={() => setSaudi((v) => v + 2)} className="border rounded-xl px-3 py-2 font-bold">+ 2 سعوديين</button>
              <button onClick={() => setNonSaudi((v) => v + 1)} className="border rounded-xl px-3 py-2 font-bold">+ غير سعودي</button>
              <input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} placeholder="اسم السيناريو" className="border rounded-xl px-3 py-2 flex-1 min-w-48" />
              <button onClick={() => void saveScenario()} className="bg-[#b88618] text-white rounded-xl px-4 py-2 font-bold">حفظ السيناريو</button>
            </div>
          )}

          {result && (
            <div className="mt-6 grid md:grid-cols-4 gap-4">
              <Card title="إجمالي العمالة" value={result.total ?? 0} />
              <Card title="السعوديون" value={result.saudi ?? 0} />
              <Card title="غير السعوديين" value={result.nonSaudi ?? 0} />
              <Card title="النطاق التقديري" value={result.band || 'غير متاح'} />
            </div>
          )}
        </div>
      </Shell>
    )
  }

  if (mode === 'company') {
    const fields: [string, string][] = [
      ['company_name', 'اسم المنشأة'], ['entity_number', 'رقم المنشأة/الكيان'], ['entity_name', 'اسم الكيان'],
      ['main_activity', 'النشاط الرئيسي'], ['sub_activity', 'النشاط الفرعي'],
    ]
    return (
      <Shell>
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-xl font-black text-[#09233f] mb-5">بيانات المنشأة</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {fields.map(([key, label]) => (
              <label key={key} className="font-bold">{label}
                <input value={company[key] || ''} onChange={(e) => setCompany({ ...company, [key]: e.target.value })} className="mt-2 w-full border rounded-xl p-3" />
              </label>
            ))}
          </div>
          <label className="block font-bold mt-4">الحالات النشطة المعتمدة من HR2
            <input value={(company.active_statuses || []).join('، ')} onChange={(e) => setCompany({ ...company, active_statuses: e.target.value.split('،').map((v: string) => v.trim()).filter(Boolean) })} className="mt-2 w-full border rounded-xl p-3" />
          </label>
          <button onClick={() => void saveCompany()} className="mt-5 bg-[#09233f] text-white rounded-xl px-5 py-2.5 font-bold inline-flex gap-2"><Save size={17} /> حفظ</button>
        </div>
      </Shell>
    )
  }

  if (mode === 'employees') {
    const headers = ['الموظف', 'الجنسية', 'الهوية/الإقامة', 'المسمى', 'القسم', 'المشروع', 'نوع العقد', 'حالة الموظف', 'الكفالة', 'GOSI', 'أجر GOSI', 'هل تم احتسابه؟', 'سبب عدم الاحتساب', 'التوثيق']
    return (
      <Shell>
        <div className="bg-white rounded-2xl border overflow-auto">
          <div className="p-5 flex justify-between"><div><h2 className="font-black text-xl">الموظفون المحتسبون</h2><div className="text-sm text-slate-500 mt-1">يظهر هنا فقط الموظفون على كفالة الشركة والمستوفون لشروط الإدراج.</div></div><button onClick={() => void load()} className="border rounded-xl px-3 py-2"><RefreshCw size={16} /></button></div>
          <table className="w-full min-w-[1300px]">
            <thead className="bg-[#09233f] text-white"><tr>{headers.map((h) => <th className="p-3 text-right" key={h}>{h}</th>)}</tr></thead>
            <tbody>{employees.map((e: any) => (
              <tr key={e.id} className="border-b">
                <td className="p-3 font-bold">{e.full_name}</td><td className="p-3">{e.nationality || 'غير معروف'}</td><td className="p-3">{e.national_id || '—'}</td>
                <td className="p-3">{e.job_title || '—'}</td><td className="p-3">{e.department || '—'}</td><td className="p-3">{e.project_name || '—'}</td>
                <td className="p-3">{e.contract_type || '—'}</td><td className="p-3">{e.employment_status || '—'}</td><td className="p-3">{e.residency_status || '—'}</td><td className="p-3">{e.gosi_status || 'غير معروف'}</td>
                <td className="p-3">{e.gosi_subscriber_wage ?? '—'}</td><td className="p-3">{e.included ? 'نعم' : 'لا'}</td>
                <td className="p-3">{e.included ? '—' : e.exclusion_reason}</td><td className="p-3">{e.contract_verification || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Shell>
    )
  }

  if (mode === 'rules') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex justify-between items-center">
            <div><h2 className="text-xl font-black text-[#09233f]">متطلبات النطاق وقواعد الاحتساب</h2><p className="text-sm text-slate-500 mt-2">القواعد محفوظة في قاعدة البيانات.</p></div>
            <ShieldCheck className="text-[#b88618]" />
          </div>

          <div className="mt-5 border rounded-2xl p-4 bg-slate-50">
            <div className="grid md:grid-cols-3 gap-3">
              <input value={ruleForm.activity_group} onChange={(e) => setRuleForm({ ...ruleForm, activity_group: e.target.value })} placeholder="النشاط الاقتصادي" className="border rounded-xl p-3" />
              <input value={ruleForm.source_title} onChange={(e) => setRuleForm({ ...ruleForm, source_title: e.target.value })} placeholder="مصدر القاعدة" className="border rounded-xl p-3" />
              <input value={ruleForm.source_url} onChange={(e) => setRuleForm({ ...ruleForm, source_url: e.target.value })} placeholder="رابط المصدر" className="border rounded-xl p-3" />
              {bands.map((band) => (
                <div key={band} className="border rounded-xl p-3 bg-white">
                  <div className="font-bold mb-2">{band}</div>
                  <input type="number" step="0.01" value={ruleForm.m_values?.[band] ?? 0} onChange={(e) => setRuleForm({ ...ruleForm, m_values: { ...ruleForm.m_values, [band]: Number(e.target.value) } })} placeholder="M" className="border rounded-lg p-2 w-full mb-2" />
                  <input type="number" step="0.01" value={ruleForm.targets?.[band]?.['2026'] ?? 0} onChange={(e) => setRuleForm({ ...ruleForm, targets: { ...ruleForm.targets, [band]: { ...ruleForm.targets?.[band], '2026': Number(e.target.value) } } })} placeholder="ث 2026" className="border rounded-lg p-2 w-full" />
                </div>
              ))}
            </div>
            <button onClick={() => void saveRule()} className="mt-3 bg-[#09233f] text-white rounded-xl px-5 py-2 font-bold inline-flex gap-2"><Save size={16} /> حفظ القاعدة</button>
          </div>

          <div className="overflow-auto mt-5">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-[#09233f] text-white"><tr><th className="p-3 text-right">النشاط</th>{bands.map((b) => <th className="p-3" key={b}>{b} — M / ث 2026</th>)}</tr></thead>
              <tbody>{rules.map((r: any) => (
                <tr className="border-b" key={r.id}>
                  <td className="p-3 font-bold">
                    {r.activity_group}
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { setEditingRule(r); setRuleForm(r) }} className="text-xs border rounded-lg px-2 py-1">تعديل</button>
                      <button onClick={async () => { try { await save('toggle_rule', { id: r.id, active: !r.active }); await load() } catch (e) { alert(e instanceof Error ? e.message : 'تعذر التعديل') } }} className="text-xs border rounded-lg px-2 py-1">{r.active ? 'تعطيل' : 'تفعيل'}</button>
                    </div>
                  </td>
                  {bands.map((b) => <td className="p-3 text-center" key={b}>{r.m_values?.[b] ?? '—'} / {r.targets?.[b]?.['2026'] ?? '—'}%</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>

          <div className="mt-6 border-t pt-6">
            <h3 className="font-black text-[#09233f]">الحالات الخاصة</h3>
            <div className="overflow-auto mt-3">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-100"><tr><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">الوصف</th><th className="p-3 text-right">نوع القاعدة</th><th className="p-3 text-right">الحالة</th></tr></thead>
                <tbody>{(data.cases || []).map((item: any) => <tr key={item.id} className="border-b"><td className="p-3 font-bold">{item.name}</td><td className="p-3">{item.description || '—'}</td><td className="p-3">{item.rule_type}</td><td className="p-3">{item.active ? 'نشطة' : 'معطلة'}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="mt-4 grid md:grid-cols-3 gap-3">
              <input id="n-case-code" placeholder="رمز الحالة" className="border rounded-xl p-3" />
              <input id="n-case-name" placeholder="اسم الحالة" className="border rounded-xl p-3" />
              <input id="n-case-type" placeholder="نوع القاعدة" className="border rounded-xl p-3" />
              <input id="n-case-desc" placeholder="الوصف" className="border rounded-xl p-3 md:col-span-2" />
              <button onClick={async () => {
                try {
                  const code = (document.getElementById('n-case-code') as HTMLInputElement).value
                  const name = (document.getElementById('n-case-name') as HTMLInputElement).value
                  const rule_type = (document.getElementById('n-case-type') as HTMLInputElement).value || 'مراجعة'
                  const description = (document.getElementById('n-case-desc') as HTMLInputElement).value
                  await save('save_case', { case: { code, name, rule_type, description, parameters: {} } })
                  await load()
                } catch (e) {
                  alert(e instanceof Error ? e.message : 'تعذر الحفظ')
                }
              }} className="bg-[#09233f] text-white rounded-xl px-4 py-2 font-bold inline-flex gap-2 justify-center"><Plus size={17} /> إضافة حالة</button>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (mode === 'history') {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border overflow-auto">
          <div className="p-5"><h2 className="font-black text-xl">سجل تاريخ النطاق</h2></div>
          <table className="w-full min-w-[1000px]">
            <thead className="bg-[#09233f] text-white"><tr>{['التاريخ','السعوديون','غير السعوديين','الإجمالي','النسبة','التقديري','الرسمي','النشاط','الملاحظات'].map((h) => <th className="p-3 text-right" key={h}>{h}</th>)}</tr></thead>
            <tbody>{(data.rows || []).map((r: any) => (
              <tr key={r.id} className="border-b">
                {[r.snapshot_date, r.saudi_count, r.non_saudi_count, r.total_count, r.localization_rate ? Number(r.localization_rate).toFixed(2) + '%' : '—', r.estimated_band || '—', r.official_band || '—', r.activity_group || '—', r.notes || '—'].map((v: any, i: number) => <td className="p-3" key={i}>{v}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Shell>
    )
  }

  if (mode === 'settings') {
    return (
      <Shell>
        <div className="grid lg:grid-cols-2 gap-5">
          <section className="bg-white rounded-2xl border p-6">
            <h2 className="text-xl font-black text-[#09233f]">إعدادات نطاقات</h2>
            <div className="mt-5 space-y-3">
              <Link href="/nitaqat/company" className="block border rounded-xl p-4 font-bold">بيانات المنشأة والحالات النشطة</Link>
              <Link href="/nitaqat/rules" className="block border rounded-xl p-4 font-bold">قواعد نطاقات ومصادرها</Link>
            </div>
          </section>
          <section className="bg-white rounded-2xl border p-6">
            <h2 className="text-xl font-black text-[#09233f]">النطاق الرسمي من قوى</h2>
            <select value={officialBand} onChange={(e) => setOfficialBand(e.target.value)} className="w-full border rounded-xl p-3 mt-4">
              <option value="">اختر النطاق</option><option>الأحمر</option><option>منخفض الأخضر</option><option>متوسط الأخضر</option><option>مرتفع الأخضر</option><option>البلاتيني</option>
            </select>
            <textarea value={officialNotes} onChange={(e) => setOfficialNotes(e.target.value)} placeholder="ملاحظات HR" className="w-full border rounded-xl p-3 mt-3 min-h-28" />
            <button onClick={() => void saveOfficial()} className="mt-3 bg-[#09233f] text-white rounded-xl px-5 py-2.5 font-bold inline-flex gap-2"><Save size={17} /> حفظ النطاق الرسمي</button>
          </section>
        </div>
      </Shell>
    )
  }

  return null
}
