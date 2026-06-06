import { useState } from 'react'
  import { useLocation } from 'wouter'
  import { useAuth } from '@/contexts/AuthContext'
  import { useLanguage } from '@/contexts/LanguageContext'
  import { LogIn, UserPlus, Eye, EyeOff } from 'lucide-react'

  type Tab = 'login' | 'register'

  export default function Login() {
    const [tab, setTab] = useState<Tab>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const { signIn, signUp } = useAuth()
    const [, navigate] = useLocation()
    const { lang } = useLanguage()

    const T = {
      title:      lang === 'pt' ? 'Portal das Trabalhadoras' : 'Portal de Trabajadoras',
      tabLogin:   lang === 'pt' ? 'Entrar' : 'Iniciar sesión',
      tabReg:     lang === 'pt' ? 'Criar conta' : 'Crear cuenta',
      emailLabel: lang === 'pt' ? 'E-mail' : 'Correo electrónico',
      passLabel:  lang === 'pt' ? 'Senha' : 'Contraseña',
      loading:    lang === 'pt' ? 'Carregando...' : 'Cargando...',
      btnLogin:   lang === 'pt' ? 'Entrar' : 'Iniciar sesión',
      btnReg:     lang === 'pt' ? 'Criar conta' : 'Crear cuenta',
      successMsg: lang === 'pt'
        ? '¡Conta criada! Verifique seu e-mail para confirmar e depois entre.'
        : '¡Cuenta creada! Revisa tu correo para confirmar tu cuenta y luego inicia sesión.',
    }

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      setError(null)
      setSuccess(null)
      setLoading(true)
      if (tab === 'login') {
        const { error } = await signIn(email, password)
        if (error) { setError(error); setLoading(false); return }
        navigate('/perfil')
      } else {
        const { error } = await signUp(email, password)
        if (error) { setError(error); setLoading(false); return }
        setSuccess(T.successMsg)
        setLoading(false)
      }
    }

    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center px-4 pt-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/25 mb-4">
              <LogIn className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">{T.title}</h1>
            <p className="text-white/45 text-sm mt-1">Eclipse Angels Agency</p>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl bg-[#0d0d1e] border border-purple-500/10 p-1 mb-6">
            {(['login', 'register'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null) }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]' : 'text-white/45 hover:text-white'}`}>
                {t === 'login' ? T.tabLogin : T.tabReg}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="bg-[#0d0d1e] border border-purple-500/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">{T.emailLabel}</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">{T.passLabel}</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" minLength={6}
                  className="w-full bg-[#07070f] border border-purple-500/20 rounded-xl px-4 py-2.5 pr-11 text-sm text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 transition-colors" />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            {success && <p className="text-green-400 text-xs bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">{success}</p>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              {loading
                ? <span className="animate-pulse">{T.loading}</span>
                : tab === 'login'
                  ? <><LogIn className="w-4 h-4"/>{T.btnLogin}</>
                  : <><UserPlus className="w-4 h-4"/>{T.btnReg}</>}
            </button>
          </form>
        </div>
      </div>
    )
  }
  