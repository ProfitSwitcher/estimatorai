// lib/db.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  // If we are in a build environment or don't have keys, this might fail appropriately later or we can warn
  // But for runtime correctness:
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Supabase URL or Service Role Key is missing. Database operations will fail.')
  }
}

// Server-side Supabase client with service role key (admin access)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
)

// Client-side Supabase client with anon key (for public access / RLS)
export const createClientComponentClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}
