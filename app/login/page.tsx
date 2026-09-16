'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_A_vnr01AW'

function getNextPath() {
  if (typeof window === 'undefined') return '/'
  const next = new URLSearchParams(window.location.search).get('next') || '/'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

async function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ])
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Do not block the login form while checking an old browser session.
    // The server cookie is the authoritative session for this application.
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const response = await withTimeout(fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password }),
        cache: 'no-store',
      }))

      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.access_token) {
        setError(result.error_description || result.msg || 'بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.')
        return
      }

      const sessionResponse = await withTimeout(fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: result.access_token }),
        cache: 'no-store',
      }))

      if (!sessionResponse.ok) {
        const sessionError = await sessionResponse.json().catch(() => ({}))
        setError(sessionError.error || 'تعذر إنشاء جلسة آمنة. حاول مرة أخرى.')
        return
      }

      router.replace(getNextPath())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error && err.message === 'TIMEOUT'
        ? 'انتهت مهلة الاتصال بالخادم. تأكد من اتصال الإنترنت وحاول مرة أخرى.'
        : 'تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main dir="rtl" className="min-h-screen relative overflow-hidden bg-[#071a2d] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_15%_20%,#d4a72c_0,transparent_28%),radial-gradient(circle_at_85%_80%,#1d5c88_0,transparent_30%)]" />
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full border border-white/10" />
      <div className="absolute -bottom-48 -right-32 w-[32rem] h-[32rem] rounded-full border border-[#d4a72c]/10" />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1fr_1.05fr] gap-8 items-center">
        <section className="hidden lg:block text-white px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/75 backdrop-blur">
            <Sparkles size={16} className="text-[#d4a72c]" />
            منصة إدارية متكاملة
          </div>
          <h1 className="text-5xl font-black leading-tight mt-6">بوابة إدارة<br /><span className="text-[#d4a72c]">الموارد البشرية والتوظيف</span></h1>
          <p className="text-white/65 text-lg leading-8 mt-6 max-w-xl">إدارة المرشحين والمقابلات والتقييمات وصلاحيات الوصول من خلال بيئة عمل آمنة وموحدة.</p>
          <div className="flex items-center gap-5 mt-10 text-sm text-white/55">
            <span className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#d4a72c]" /> وصول محمي</span>
            <span className="flex items-center gap-2"><LockKeyhole size={18} className="text-[#d4a72c]" /> جلسات آمنة</span>
          </div>
        </section>

        <section className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-xl rounded-[2rem] p-7 md:p-9 shadow-[0_30px_80px_rgba(0,0,0,.35)] border border-white/30">
          <div className="text-center mb-7">
            <div className="mx-auto w-20 h-20 rounded-[1.6rem] bg-[#09233f] text-[#d4a72c] flex items-center justify-center shadow-lg shadow-[#09233f]/20"><ShieldCheck size={43} strokeWidth={1.8} /></div>
            <h2 className="text-3xl font-black text-[#09233f] mt-5">مرحباً بك</h2>
            <p className="text-slate-500 mt-2">سجّل الدخول للوصول إلى النظام</p>
          </div>

          <div className="flex items-start gap-3 mb-6 p-4 rounded-2xl bg-[#f7f9fc] border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-[#09233f] text-[#d4a72c] flex items-center justify-center shrink-0"><LockKeyhole size={19} /></div>
            <div><div className="font-black text-[#09233f]">دخول آمن</div><div className="text-xs text-slate-500 mt-1 leading-5">هذه البوابة مخصصة للمستخدمين المعتمدين فقط.</div></div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <label className="block text-sm font-bold text-[#09233f]">البريد الإلكتروني
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required className="mt-2 w-full border border-slate-300 focus:border-[#b88618] focus:ring-4 focus:ring-[#d4a72c]/10 outline-none rounded-xl px-4 py-3.5 bg-white transition" placeholder="name@company.com" />
            </label>
            <label className="block text-sm font-bold text-[#09233f]">كلمة المرور
              <div className="relative mt-2">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required className="w-full border border-slate-300 focus:border-[#b88618] focus:ring-4 focus:ring-[#d4a72c]/10 outline-none rounded-xl px-4 py-3.5 pl-12 bg-white transition" placeholder="أدخل كلمة المرور" />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#09233f] transition" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
              </div>
            </label>
            {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3.5 text-sm font-bold leading-6">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-[#09233f] hover:bg-[#12385d] disabled:opacity-60 text-white rounded-xl px-5 py-3.5 font-black flex items-center justify-center gap-2 transition shadow-lg shadow-[#09233f]/15">
              <LogIn size={19} />{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}{!loading && <ArrowLeft size={17} />}
            </button>
          </form>
          <div className="flex items-center justify-center gap-2 mt-6 text-[11px] text-slate-400"><LockKeyhole size={13} /> اتصال محمي ومخصص للمستخدمين المصرح لهم</div>
        </section>
      </div>
    </main>
  )
}
