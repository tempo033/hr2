// Vercel deployment sync check
// Production build verification: users list auth types are explicit.
import { NextRequest, NextResponse } from 'next/server'
import { getServerAuth, supabaseHeaders } from '@/lib/server-auth'

const BOOTSTRAP_EMAIL = 'hr@albenyah.sa'

type AuthUser = { id?: string; email?: string }

type ProfileUser = {
  user_id: string
  display_name?: string | null
  role?: string | null
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
  email?: string
  last_sign_in_at?: string | null
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getServerAuth(req, ['admin'])
    if (!auth) {
      return NextResponse.json({ error: 'لا تملك صلاحية عرض المستخدمين.' }, { status: 403 })
    }

    const authUser = auth.user as AuthUser
    const headers = supabaseHeaders(auth)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pdkdvaisggntdrvpxuur.supabase.co'

    const profilesResponse = await fetch(
      `${supabaseUrl}/rest/v1/app_users?select=user_id,display_name,role,is_active,created_at,updated_at&order=created_at.desc`,
      { headers, cache: 'no-store' },
    )

    if (!profilesResponse.ok) {
      return NextResponse.json({ error: await profilesResponse.text() }, { status: 500 })
    }

    const profiles = (await profilesResponse.json()) as ProfileUser[]
    const users: ProfileUser[] = profiles.map((p) => ({
      ...p,
      email: p.user_id === authUser.id ? authUser.email || '' : '',
    }))

    if (auth.serviceKey) {
      const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=1000`, {
        headers: {
          apikey: auth.serviceKey,
          Authorization: `Bearer ${auth.serviceKey}`,
        },
        cache: 'no-store',
      })

      if (authResponse.ok) {
        const data = (await authResponse.json()) as {
          users?: Array<{ id?: string; email?: string; last_sign_in_at?: string | null }>
        }
        const authUsers = new Map((data.users || []).map((u) => [u.id, u]))

        for (const user of users) {
          const authRecord = authUsers.get(user.user_id)
          if (authRecord) {
            user.email = authRecord.email || ''
            user.last_sign_in_at = authRecord.last_sign_in_at || null
          }
        }
      }
    }

    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع.' },
      { status: 500 },
    )
  }
}
