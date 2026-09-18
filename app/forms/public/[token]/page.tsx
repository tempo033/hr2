'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import RequestForm from '@/app/forms/shared/RequestForm'

export default function PublicFormPage() {
  const params = useParams<{ token: string }>()
  const [kind, setKind] = useState<'leave'|'clearance'|'advance'|null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!params?.token) return
    fetch(`/api/forms/public/${params.token}`, { cache: 'no-store' })
      .then(async r => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'تعذر فتح الرابط')
        setKind(data.link.form_type)
      })
      .catch(e => setError(e.message))
  }, [params?.token])

  if (error) return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 p-6"><div className="bg-white border rounded-2xl p-8 text-center max-w-md"><h1 className="font-black text-xl text-red-700">تعذر فتح النموذج</h1><p className="text-slate-500 mt-2">{error}</p></div></main>
  if (!kind) return <main dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 text-slate-500">جارٍ فتح النموذج...</main>
  return <RequestForm kind={kind} publicToken={params.token} />
}
