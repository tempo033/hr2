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
  const rawToken = req.cookies.get(AUTH_COOKIE)?.value?.trim() || ''
  const token = rawToken.replace(/^Bearer\s+/i, '').trim()
  if (!token || !PUBLIC_KEY || token.split('.').length !== 3) return null

  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!authRes.ok) return null

  const user = await authRes.json()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || null
  // Always validate the signed-in user with the public key + user JWT. Never send a sb_secret key as Authorization.
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/app_users?select=role,is_active&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    { headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
  const rows = profileRes.ok ? await profileRes.json() : []
  const role = user.email?.toLowerCase() === BOOTSTRAP_EMAIL ? 'admin' : rows[0]?.role
  if (!allowedRoles.includes(role) || (role !== 'admin' && rows[0]?.is_active !== true)) return null

  return { user, role, token, serviceKey }
}

export function supabaseHeaders(auth: ServerAuth, extra: Record<string, string> = {}) {
  // Supabase API keys and user access tokens have different jobs:
  // - apikey: project API key (secret/service_role or publishable/anon)
  // - Authorization: the authenticated user's JWT
  // Never put an sb_* secret/publishable key in Authorization: Bearer.
  const configuredKey = auth.serviceKey?.replace(/^Bearer\\s+/i, '').trim() || ''
  const legacyServiceJwt = configuredKey.split('.').length === 3
  const apiKey = configuredKey || PUBLIC_KEY
  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${legacyServiceJwt ? configuredKey : auth.token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  }
  return headers
}

export function supabaseAdminHeaders(auth: ServerAuth, extra: Record<string, string> = {}) {
  const key = auth.serviceKey?.replace(/^Bearer\\s+/i, '').trim() || ''
  if (!key) return supabaseHeaders(auth, extra)
  const legacyServiceJwt = key.split('.').length === 3
  const headers: Record<string, string> = {
    apikey: key,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(legacyServiceJwt ? { Authorization: \`Bearer \${key}\` } : {}),
    ...extra,
  }
  return headers
}
