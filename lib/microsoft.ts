import 'server-only'

import { cookies } from 'next/headers'
import crypto from 'node:crypto'

const ACCESS_COOKIE = 'microsoft_refresh_token'
const STATE_COOKIE = 'microsoft_oauth_state'
const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'User.Read', 'Calendars.ReadWrite'].join(' ')

function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function microsoftConfig() {
  return {
    clientId: env('MICROSOFT_CLIENT_ID'),
    clientSecret: env('MICROSOFT_CLIENT_SECRET'),
    tenant: process.env.MICROSOFT_TENANT_ID || 'common',
    appUrl: env('NEXT_PUBLIC_APP_URL').replace(/\/$/, ''),
    allowedEmail: (process.env.MICROSOFT_ALLOWED_EMAIL || 'hr_manager1@outlook.sa').toLowerCase(),
  }
}

export function microsoftRedirectUri() {
  return `${microsoftConfig().appUrl}/api/microsoft/callback`
}

function key() {
  return crypto.createHash('sha256').update(env('MICROSOFT_TOKEN_SECRET')).digest()
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`
}

function decrypt(value: string) {
  const [ivRaw, tagRaw, dataRaw] = value.split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivRaw, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(dataRaw, 'base64url')), decipher.final()]).toString('utf8')
}

export async function setRefreshToken(token: string) {
  const jar = await cookies()
  jar.set(ACCESS_COOKIE, encrypt(token), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
}

export async function clearMicrosoftSession() {
  const jar = await cookies()
  jar.delete(ACCESS_COOKIE)
  jar.delete(STATE_COOKIE)
}

export async function setOAuthState(state: string) {
  const jar = await cookies()
  jar.set(STATE_COOKIE, state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 })
}

export async function consumeOAuthState() {
  const jar = await cookies()
  const value = jar.get(STATE_COOKIE)?.value
  jar.delete(STATE_COOKIE)
  return value
}

export async function getRefreshToken() {
  const value = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!value) return null
  try { return decrypt(value) } catch { return null }
}

async function tokenRequest(params: URLSearchParams) {
  const cfg = microsoftConfig()
  const response = await fetch(`https://login.microsoftonline.com/${cfg.tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || data.error || 'Microsoft token request failed')
  return data
}

export async function exchangeAuthorizationCode(code: string) {
  const cfg = microsoftConfig()
  return tokenRequest(new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: microsoftRedirectUri(),
    grant_type: 'authorization_code',
    scope: SCOPES,
  }))
}

export async function getAccessToken() {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null
  try {
    const data = await tokenRequest(new URLSearchParams({
      client_id: microsoftConfig().clientId,
      client_secret: microsoftConfig().clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: SCOPES,
    }))
    if (data.refresh_token) await setRefreshToken(data.refresh_token)
    return data.access_token as string
  } catch {
    await clearMicrosoftSession()
    return null
  }
}

export async function graph(path: string, init: RequestInit = {}) {
  const accessToken = await getAccessToken()
  if (!accessToken) throw new Error('Microsoft account is not connected')
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  headers.set('Content-Type', 'application/json')
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, { ...init, headers, cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error?.message || `Microsoft Graph error ${response.status}`)
  return data
}

export { SCOPES }
