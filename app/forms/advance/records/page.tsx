'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, ExternalLink, RefreshCw, CheckCircle2, Clock3 } from 'lucide-react'

type Row = {
  id: string
  employee_name: string | null
  employee_number: string | null
  department: string | null
  status: string
  updated_at: string
  last_ip_address: string | null
  last_device_name: string | null
  submitted_via_link: boolean
  employee_id?: string | null
}

export default function Records() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [selected, setSelected] = useState<Row | null>(null)
  const [links, setLinks] = useState<any[]>([])

  const load = async () => {
    setLoading(true)
    const [r, l, e] = await Promise.all([
      fetch('/api/forms/records?form_type=advance', { cache: 'no-store' }),
      fetch('/api/forms/links', { cache: 'no-store' }),
      fetch('/api/employees/data', { cache: 'no-store' }),
    ])

    const d = await r.json().catch(() => ({}))
    const ld = await l.json().catch(() => ({}))
    const ed = await e.json().catch(() => ({}))

    setRows(d.records || [])
    setLinks(ld.links || [])
    setEmployees(ed.employees || ed.records || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const make = async () => {
    if (!employeeId) return

    const r = await fetch('/api/forms/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form_type: 'advance', employee_id: employeeId }),
    })

    const d = await r.json().catch(() => ({}))

    if (r.ok) {
      setEmployeeId('')
      await load()
    }
  }

  const linkLabel = (scope: string) => {
    if (scope === 'advance:employee') return 'الموظف'
    if (scope === 'advance:hr') return 'الموارد البشرية'
    if (scope === 'advance:finance') return 'الإدارة المالية'
    return 'المدير العام'
  }

  const selectedLinks = selected
    ? links.filter(
        (x: any) =>
          x.form_type === 'advance' &&
          x.record_id === selected.id &&
          x.link_scope?.startsWith('advance:')
      )
    : []

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] p-5 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
          <div>
            <div className="text-[#b88618] font-bold">مركز النماذج / طلبات السلف المالية</div>
            <h1 className="text-3xl font-black text-[#09233f]">طلبات السلف المالية</h1>
            <p className="text-slate-500 mt-1">
              جميع الطلبات المسجلة وحالات الوصول وبيانات الجهاز وIP.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/forms"
              className="border bg-white rounded-xl px-4 py-2 font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <ArrowLeft size={16} /> مركز النماذج
            </Link>
            <button
              onClick={load}
              className="bg-[#09233f] text-white rounded-xl px-4 py-2 font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RefreshCw size={16} /> تحديث
            </button>
          </div>
        </header>

        <section className="bg-[#09233f] text-white rounded-2xl p-5 mb-6">
          <h2 className="font-black text-lg">إنشاء طلب سلفة مالية</h2>
          <p className="text-slate-300 text-sm mt-1">
            اختر الموظف لإنشاء طلب جديد. سيتم إنشاء روابط الاعتماد الخاصة بهذا الطلب تلقائيًا، ولن تظهر هنا.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="flex-1 min-w-0 rounded-lg px-3 py-2 text-slate-800"
            >
              <option value="">اختر الموظف</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.employee_number || 'بدون رقم'} — {e.full_name || 'بدون اسم'}
                </option>
              ))}
            </select>

            <button
              disabled={!employeeId}
              onClick={make}
              className="bg-[#b88618] rounded-lg px-5 py-2 font-bold disabled:opacity-50 whitespace-nowrap"
            >
              إنشاء طلب السلفة
            </button>
          </div>
        </section>

        <section className="bg-white border rounded-2xl overflow-hidden">
          <div className="p-4 border-b font-black">سجل طلبات السلف المالية</div>

          {loading ? (
            <div className="p-10 text-center">جارٍ التحميل...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-right">الموظف</th>
                    <th className="p-3 text-right">القسم</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">الجهاز</th>
                    <th className="p-3 text-right">IP</th>
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-right min-w-[235px]">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t align-middle">
                      <td className="p-3 font-bold">
                        {r.employee_name || '—'}
                        <div className="text-xs text-slate-500">{r.employee_number || ''}</div>
                      </td>
                      <td className="p-3">{r.department || '—'}</td>
                      <td className="p-3">{r.status}</td>
                      <td className="p-3">
                        {r.submitted_via_link ? r.last_device_name || 'غير معروف' : 'داخلي'}
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {r.submitted_via_link ? r.last_ip_address || '—' : '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {new Date(r.updated_at).toLocaleString('ar-SA')}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2 min-w-[220px]">
                          <button
                            onClick={() => setSelected(r)}
                            className="min-h-[38px] bg-emerald-700 text-white rounded-lg px-3 py-2 font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-none"
                          >
                            <ExternalLink size={15} /> روابط الاعتماد
                          </button>
                          <Link
                            href={`/forms/advance/records/${r.id}`}
                            className="min-h-[38px] bg-[#09233f] text-white rounded-lg px-3 py-2 font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-none"
                          >
                            عرض / تعديل
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!rows.length && (
                <div className="p-8 text-center text-slate-500">لا توجد نماذج مسجلة.</div>
              )}
            </div>
          )}
        </section>

        {selected && (
          <section className="mt-6 bg-white border rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <div>
                <h2 className="text-xl font-black text-[#09233f]">روابط اعتماد طلب السلفة</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selected.employee_name || '—'} — الروابط التالية خاصة بهذا الطلب فقط.
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="border rounded-lg px-3 py-2 font-bold whitespace-nowrap self-start"
              >
                إغلاق
              </button>
            </div>

            {selectedLinks.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {selectedLinks.map((x: any) => (
                  <div key={x.id} className="border rounded-xl p-4 min-w-0">
                    <div className="font-black text-[#09233f] truncate">{linkLabel(x.link_scope)}</div>

                    <div className={`mt-2 text-sm font-bold ${x.last_submitted_at ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {x.last_submitted_at ? (
                        <>
                          <CheckCircle2 size={15} className="inline ml-1 align-[-2px]" />
                          تم الاعتماد
                        </>
                      ) : (
                        <>
                          <Clock3 size={15} className="inline ml-1 align-[-2px]" />
                          قيد الانتظار
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={x.public_url}
                        className="min-h-[36px] flex-1 min-w-[105px] bg-[#09233f] text-white rounded-lg px-3 py-2 font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-none text-xs"
                      >
                        <ExternalLink size={14} /> فتح الرابط
                      </a>
                      <button
                        onClick={() =>
                          copy(x.public_url)
                        }
                        className="min-h-[36px] bg-white border rounded-lg px-3 py-2 font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-none text-xs"
                      >
                        {copied===x.public_url?<CheckCircle2 size={14}/>:<Copy size={14}/>} نسخ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 text-center text-slate-500">
                لا توجد روابط اعتماد مرتبطة بهذا الطلب.
              </div>
            )}
          </section>
        )}
      </div>
    {copied&&<div className="form-copy-toast">تم نسخ الرابط بنجاح</div>}</main>
  )
}
