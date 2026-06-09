import { createClient } from '@supabase/supabase-js'

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://placeholder.supabase.co"
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "placeholder-key"

  export const supabase = createClient(supabaseUrl, supabaseAnonKey)

  export interface Profile {
      id: string
      email: string
      is_admin: boolean
      is_agent?: boolean
      is_colider?: boolean
      agent_name?: string | null
      agent_code?: string | null
      colider_name?: string | null
      phone?: string | null
      telefono?: string | null
      created_at: string
    }

  export interface WorkerEntry {
    id: string
    user_id: string
    app_name: string
    nombre_real: string | null
    nombre_en_app: string | null
    id_aplicacion: string | null
    telefono: string | null
    codigo_pais: string | null
    pais: string | null
    metodo_pago: string | null
    billetera: string | null
    agente: string | null
    created_at: string
    updated_at: string
  }

  export const PAYMENT_METHODS_BY_COUNTRY: Record<string, string[]> = {
    Cuba: ['Efectivo (Cuba)', 'Transferencia Bancaria (Cuba)'],
    Brasil: ['Binance', 'Pix'],
  }
  export const DEFAULT_PAYMENT_METHODS = ['Binance']

  export function getPaymentMethods(pais: string): string[] {
    return PAYMENT_METHODS_BY_COUNTRY[pais] ?? DEFAULT_PAYMENT_METHODS
  }

  export const WALLET_LABELS: Record<string, string> = {
    'Binance': 'UID / Dirección Binance',
    'Pix': 'Clave Pix',
    'Transferencia Bancaria (Cuba)': 'Número de cuenta bancaria',
  }

  export function getWalletLabel(metodo: string): string | null {
    return WALLET_LABELS[metodo] ?? null
  }

  export const COUNTRIES = [
    'Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Cuba',
    'Ecuador','El Salvador','España','Estados Unidos','Guatemala','Honduras',
    'México','Nicaragua','Panamá','Paraguay','Perú','Puerto Rico',
    'República Dominicana','Uruguay','Venezuela','Otro',
  ]
  