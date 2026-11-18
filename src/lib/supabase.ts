import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key && !url.includes('TU-PROYECTO'))

// La clave publicable (anon) se usa en el navegador. Nunca colocar service_role aquí.
export const supabase = createClient(
  configured ? url! : 'https://example.supabase.co',
  configured ? key! : 'sin-configurar',
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } },
)
