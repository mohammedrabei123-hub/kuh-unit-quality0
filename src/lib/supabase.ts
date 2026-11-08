import { createClient } from '@supabase/supabase-js'

const env = import.meta.env as Record<string, string | undefined>
// بيقبل أسماء Vite أو NEXT_PUBLIC (نفس أسماء تكامل Supabase مع Vercel)
const url = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
const key =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_ANON_KEY ??
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const envMissing = !url || !key

// مفتاح anon فقط — مفيش service role في المتصفح. الحماية الفعلية عن طريق RLS.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true },
})
