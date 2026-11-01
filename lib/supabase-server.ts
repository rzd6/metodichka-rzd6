import { createClient } from "@supabase/supabase-js"

let client: ReturnType<typeof createClient> | null = null

export function getSupabaseServer(): any {
  if (client) return client
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error("Supabase server credentials are required")
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) },
  })
  return client
}
