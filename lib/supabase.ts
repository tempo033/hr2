import { createClient } from '@supabase/supabase-js'

// The public Supabase URL and publishable/anon key are safe to use in a browser
// application. Environment variables remain the preferred configuration, while
// these project defaults keep the app connected when a deployment has not yet
// been configured with environment variables.
const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://pdkdvaisggntdrvpxuur.supabase.co'

const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_S-xxocuLz-FX_6HLaYhb0A_Avnr01AW'

export const supabase = createClient(url, key)
