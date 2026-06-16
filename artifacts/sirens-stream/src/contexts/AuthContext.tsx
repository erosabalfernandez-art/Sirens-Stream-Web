import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
  import type { User } from '@supabase/supabase-js'
  import { supabase, type Profile } from '@/lib/supabase'
  import { subscribeToPush, checkPushEndpointInDB, wasManuallyUnsubscribed } from '@/lib/push'

  interface AuthContextType {
    user: User | null
    profile: Profile | null | undefined
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
  }

  const AuthContext = createContext<AuthContextType | null>(null)

  /**
   * Ensures this device has a valid, synced push subscription in Supabase.
   * Compares the browser endpoint with DB — only re-registers if they differ.
   * Skipped if THIS user manually unsubscribed on this device.
   */
  function silentPushRefresh(userId: string) {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (wasManuallyUnsubscribed(userId)) return   // per-user check

    checkPushEndpointInDB(userId)
      .then(alreadySynced => {
        if (!alreadySynced) {
          subscribeToPush(userId).catch(() => {})
        }
      })
      .catch(() => {
        subscribeToPush(userId).catch(() => {})
      })
  }

  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
    const [loading, setLoading] = useState(true)

    async function loadProfile(userId: string, retries = 3): Promise<void> {
      const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController()
          const tid = setTimeout(() => controller.abort(), 5000)
          const res = await fetch(`${apiBase}/api/profile?user_id=${encodeURIComponent(userId)}`, { signal: controller.signal })
          clearTimeout(tid)
          if (res.ok) {
            const data = await res.json()
            setProfile(data as Profile)
            silentPushRefresh(userId)
            return
          }
          if (res.status === 404) {
            console.warn('[Auth] Profile not found — user was deleted, forcing sign out')
            setProfile(null)
            await supabase.auth.signOut()
            return
          }
          console.warn(`[Auth] loadProfile attempt ${attempt} HTTP ${res.status}`)
        } catch (err: any) {
          console.warn(`[Auth] loadProfile attempt ${attempt} failed:`, err?.message)
        }
        if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 500))
      }
      setProfile(null)
    }

    useEffect(() => {
      let cancelled = false

      const timeout = setTimeout(() => {
        if (!cancelled) {
          console.warn('[Auth] getSession timed out — showing app without auth')
          setLoading(false)
          setProfile(prev => prev === undefined ? null : prev)
        }
      }, 5000)

      supabase.auth.getSession()
        .then(async ({ data: { session } }) => {
          if (cancelled) return
          setUser(session?.user ?? null)
          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setProfile(null)
          }
        })
        .catch((err) => {
          console.error('[Auth] getSession error:', err)
          if (!cancelled) setProfile(null)
        })
        .finally(() => {
          if (!cancelled) {
            clearTimeout(timeout)
            setLoading(false)
          }
        })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return
        if (event === 'INITIAL_SESSION') return
        setUser(session?.user ?? null)
        if (session?.user) {
          setProfile(undefined)
          loadProfile(session.user.id)
        } else {
          setProfile(null)
        }
      })

      return () => {
        cancelled = true
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    }, [])

    async function signIn(email: string, password: string) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error: error?.message ?? null }
    }

    async function signUp(email: string, password: string) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (!error && data.user) {
        const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '')
        try { await fetch(`${apiBase}/api/profile?user_id=${encodeURIComponent(data.user.id)}`) } catch {}
      }
      return { error: error?.message ?? null }
    }

    async function signOut() {
      await supabase.auth.signOut()
    }

    return (
      <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
        {children}
      </AuthContext.Provider>
    )
  }

  export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
  }
