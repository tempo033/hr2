'use client'

import { FormEvent, useEffect, useState } from 'react'
import { LockKeyhole, LogIn, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active || !data.session?.access_token) return
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: data.session.access_token }),
      })
      if (active && response.ok) router.replace(searchParams.get('next') || '/')
    })
    return () => { active = false }
  }, [router, searchParams])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (signInError || !data.session?.access_token) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.')
      setLoading(false)
      return
    }

    const sessionResponse = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: data.session.access_token }),
    })

    if (!sessionResponse.ok) {
      await supabase.auth.signOut()
      setError('تعذر إنشاء جلسة آمنة. حاول مرة أخرى.')
      setLoading(false)
      return
    }

    router.replace(searchParams.get('next') || '/')
    router.refresh()
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f7fa] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center shadow-xl">
            <ShieldCheck size={42} />
          </div>
          <h1 className="text-3xl font-black text-[#09233f] mt-5">تسجيل الدخول</h1>
          <p className="text-slate-500 mt-2">نظام إدارة الموارد البشرية والتوظيف</p>
        </div>

        <section className="bg-white border-2 border-slate-200 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <LockKeyhole className="text-[#b88618]" size={22} />
            <div>
              <div className="font-black text-[#09233f]">منطقة محمية</div>
              <div className="text-xs text-slate-500 mt-1">يلزم حساب معتمد للدخول إلى النظام.</div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block font-bold text-[#09233f]">
              اسم المستخدم / البريد الإلكتروني
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required className="mt-2 w-full border-2 border-slate-200 rounded-xl px-4 py-3 bg-white" placeholder="name@company.com" />
            </label>

            <label className="block font-bold text-[#09233f]">
              كلمة المرور
              <div className="relative mt-2">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 pl-12 bg-white" placeholder="أدخل كلمة المرور" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label="إظهار كلمة المرور">{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
            </label>

            {error && <div className="rounded-xl bg-red-50 border-2 border-red-200 text-red-700 p-3 text-sm font-bold">{error}</div>}

            <button disabled={loading} className="w-full bg-[#09233f] hover:bg-[#12385d] disabled:opacity-60 text-white rounded-xl px-5 py-3.5 font-black flex items-center justify-center gap-2 transition">
              <LogIn size={19} />
              {loading ? 'جاري التحقق...' : 'دخول إلى النظام'}
            </button>
          </form>
        </section>

        <p className="text-center text-xs text-slate-400 mt-5">شركة البنية الأساسية للمقاولات • نظام داخلي محمي</p>
      </div>
    </main>
  )
}
