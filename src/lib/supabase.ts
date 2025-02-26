import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = typeof window !== 'undefined'
  ? createBrowserClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      db: {
        schema: 'public'
      }
    })
  : null

if (typeof window !== 'undefined' && supabase) {
  console.log('Supabase client initialized')
}
