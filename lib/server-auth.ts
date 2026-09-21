import { NextRequest } from 'next/server'

export const AUTH_COOKIE = 'hr2_access_token'
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'
export const PUBLIC_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'
export const BOOTSTRAP_EMAIL = 'hr@albenyah.sa'

export type ServerAuth = {
  user: any
  role: string
  token: string
  serviceKey: string | null
}

export async function getServerAuth(req: NextRequest, allowedRoles: string[]): Promise<ServerAuth | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value
  if (!token || !PUBLIC_KEY) return null

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!authRes.ok) return null

  const user = await authRes.json()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null
  const apiKey = serviceKey || PUBLIC_KEY
  const authorization = serviceKey ? `Bearer ${serviceKey}` : `Bearer ${token}`
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    { headers: { apikey: apiKey, Authorization: authorization }, cache: 'no-store' },
  )
  const rows = profileRes.ok ? await profileRes.json() : []
  const role = user.email?.toLowerCase() === BOOTSTRAP_EMAIL ? 'admin' : rows[0]?.role
  if (!allowedRoles.includes(role) || (role !== 'admin' && rows[0]?.is_active !== true)) return null

  return { user, role, token, serviceKey }
}

export function supabaseHeaders(auth: ServerAuth, extra: Record<string, string> = {}) {
  const apiKey = auth.serviceKey || PUBLIC_KEY
  const authorization = auth.serviceKey ? `Bearer ${auth.serviceKey}` : `Bearer ${auth.token}`
  return { apikey: apiKey, Authorization: authorization, Accept: 'application/json', 'Content-Type': 'application/json', ...extra }
}
