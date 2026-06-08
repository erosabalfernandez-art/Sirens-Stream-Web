import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
  import type { User } from '@supabase/supabase-js'
  import { supabase, type Profile } from '@/lib/supabase'

  interface AuthContextType {
    user: User | null
    profile: Profile | null | undefined  // undefined = loading, null = not found / logged out
    loading: boolean
    signIn: (email: string, password: string) => Promise<{ error: string | null }>
    signUp: (email: string, password: string) => Promise<{ error: string | null }>
    signOut: () => Promise<void>
  }

  const AuthContext = createContext<AuthContextType | null>(null)

  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
    const [loading, setLoading] = useState(true)

    async function loadProfile(userId: string, retries = 3): Promise<void> {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          // Race the Supabase query against a per-attempt timeout so slow
          // mobile connections don't hang the UI indefinitely.
          const queryPromise = supabase
            .from('profiles')
            .select('id, email, is_admin, is_agent, is_colider, agent_name, agent_code, colider_name, phone, telefono, created_at')
            .eq('id', userId)
            .single()

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('profile_timeout')), 4000)
          )

          const { data, error } = await Promise.race([queryPromise, timeoutPromise])

          if (data) {
            setProfile(data as Profile)
            return
          }
          if (error) console.error(`[Auth] Profile load attempt ${attempt} failed:`, error.message)
        } catch (err: any) {
          if (err?.message === 'profile_timeout') {
            console.warn(`[Auth] loadProfile attempt ${attempt} timed out`)
          } else {
            console.error(`[Auth] Profile load attempt ${attempt} threw:`, err)
          }
        }
        if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 500))
      }
      // All retries exhausted — signal "no profile found" so routing doesn't hang
      setProfile(null)
    }

    useEffect(() => {
      let cancelled = false

      // Hard timeout: if Supabase doesn't respond in 5 s, unblock the UI
      const timeout = setTimeout(() => {
        if (!cancelled) {
          console.warn('[Auth] getSession timed out — showing app without auth')
          setLoading(false)
          // Also resolve profile so the "Cargando perfil…" state doesn't persist
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

        // Skip the INITIAL_SESSION event — it fires as a side-effect of
        // getSession() and would otherwise reset profile to undefined right
        // after getSession already resolved it, causing a race condition that
        // leaves mobile users on a black "loading" screen.
        if (event === 'INITIAL_SESSION') return

        setUser(session?.user ?? null)
        if (session?.user) {
          // Reset profile to undefined (loading) before fetching
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
      const { error } = await supabase.auth.signUp({ email, password })
      return { error: error?.message ?? null }
    }

    // Don't manually setUser/setProfile here — onAuthStateChange handles it
    // to avoid double state updates that cause the carousel and UI to flash
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
  