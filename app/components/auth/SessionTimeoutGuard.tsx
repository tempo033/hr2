'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock3, LogOut, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const WARNING_SECONDS = 30

export default function SessionTimeoutGuard() {
  const [showWarning, setShowWarning] = useState(false)
  const [seconds, setSeconds] = useState(WARNING_SECONDS)
  const loggingOut = useRef(false)

  const logout = useCallback(async () => {
    if (loggingOut.current) return
    loggingOut.current = true
    try { await supabase.auth.signOut() } catch {}
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    window.location.replace('/login?reason=session-expired')
  }, [])

  const showExpired = useCallback(() => {
    if (loggingOut.current) return
    setSeconds(WARNING_SECONDS)
    setShowWarning(true)
  }, [])

  const syncCookie = useCallback(async (accessToken: string) => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
      cache: 'no-store',
    })
    return response.ok
  }, [])

  const extendSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data.session?.access_token) {
        showExpired()
        return
      }
      const synced = await syncCookie(data.session.access_token)
      if (!synced) {
        showExpired()
        return
      }
      setShowWarning(false)
      setSeconds(WARNING_SECONDS)
      window.dispatchEvent(new Event('hr2-session-refreshed'))
    } catch {
      showExpired()
    }
  }, [showExpired, syncCookie])

  useEffect(() => {
    let mounted = true

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (!data.session) {
        const me = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null)
        if (!mounted) return
        if (!me?.ok) showExpired()
        return
      }

      const expiresAt = data.session.expires_at
      if (expiresAt && expiresAt * 1000 <= Date.now()) showExpired()
      else if (data.session.access_token) await syncCookie(data.session.access_token)
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') {
        showExpired()
        return
      }
      if ((event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') && session?.access_token) {
        void syncCookie(session.access_token)
        setShowWarning(false)
        setSeconds(WARNING_SECONDS)
      }
    })

    void checkSession()
    const interval = window.setInterval(() => { void checkSession() }, 30000)

    return () => {
      mounted = false
      window.clearInterval(interval)
      listener.subscription.unsubscribe()
    }
  }, [showExpired, syncCookie])

  useEffect(() => {
    if (!showWarning) return
    if (seconds <= 0) {
      void logout()
      return
    }
    const timer = window.setTimeout(() => setSeconds(value => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [showWarning, seconds, logout])

  if (!showWarning) return null

  return (
    <div dir="rtl" className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl border border-slate-200">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <Clock3 size={32} />
        </div>
        <h2 className="text-center text-2xl font-black text-[#09233f]">انتهت جلسة تسجيل الدخول</h2>
        <p className="mt-3 text-center leading-7 text-slate-600">
          انتهت مدة الجلسة أو لم تعد صالحة. هل تريد تمديد الجلسة ومتابعة العمل؟
        </p>
        <div className="mt-5 rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
          <div className="text-sm font-bold text-red-700">سيتم تسجيل الخروج تلقائياً خلال</div>
          <div className="mt-1 text-3xl font-black text-red-700">{seconds} ثانية</div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => void extendSession()} className="flex items-center justify-center gap-2 rounded-xl bg-[#09233f] px-4 py-3.5 font-black text-white hover:bg-[#12385d]">
            <RefreshCw size={18} /> تمديد الجلسة
          </button>
          <button type="button" onClick={() => void logout()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3.5 font-black text-slate-700 hover:bg-slate-50">
            <LogOut size={18} /> تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  )
}
