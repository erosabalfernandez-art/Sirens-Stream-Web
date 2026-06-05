import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
    import type { User } from '@supabase/supabase-js'
    import { supabase, type Profile } from '@/lib/supabase'

    interface AuthContextType {
      user: User | null
      profile: Profile | null
      loading: boolean
      signIn: (email: string, password: string) => Promise<{ error: string | null }>
      signUp: (email: string, password: string) => Promise<{ error: string | null }>
      signOut: () => Promise<void>
    }

    const AuthContext = createContext<AuthContextType | null>(null)

    export function AuthProvider({ children }: { children: ReactNode }) {
      const [user, setUser] = useState<User | null>(null)
      const [profile, setProfile] = useState<Profile | null>(null)
      const [loading, setLoading] = useState(true)

      async function loadProfile(userId: string, retries = 3): Promise<void> {
        for (let attempt = 1; attempt <= retries; attempt++) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
          if (data) {
            setProfile(data as Profile)
            return
          }
          if (error) console.error(`[Auth] Profile load attempt ${attempt} failed:`, error.message)
          if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 500))
        }
      }

      useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session } }) => {
          setUser(session?.user ?? null)
          if (session?.user) await loadProfile(session.user.id)
          setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          setUser(session?.user ?? null)
          if (session?.user) {
            loadProfile(session.user.id)
          } else {
            setProfile(null)
          }
        })

        return () => subscription.unsubscribe()
      }, [])

      async function signIn(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error: error?.message ?? null }
      }

      async function signUp(email: string, password: string) {
        const { error } = await supabase.auth.signUp({ email, password })
        return { error: error?.message ?? null }
      }

      async function signOut() {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
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
  