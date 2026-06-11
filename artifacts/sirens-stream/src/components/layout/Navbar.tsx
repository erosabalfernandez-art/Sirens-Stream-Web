import { Link, useLocation } from "wouter";
    import { useEffect, useState } from "react";
    import { useAuth } from "@/contexts/AuthContext";
    import { useShowAgencia } from "@/hooks/useShowAgencia";
    import { useLanguage } from "@/contexts/LanguageContext";
    import {User, Users, LogOut, Shield, FileSpreadsheet, DollarSign, Radio, Globe, CheckCircle, Zap, Trophy} from "lucide-react";

    const NAV_LINKS = {
      es: [
        { href: "/", label: "Home" },
        { href: "/ser-streamer", label: "Únete" },
        { href: "/crear-agencia", label: "Agencia", key: "agencia" },
        { href: "/apps", label: "Apps" },
        { href: "/nosotros", label: "Equipo" },
        { href: "/pagos", label: "Pagos" },
        { href: "/ranking", label: "Ranking" },
      ],
      pt: [
        { href: "/", label: "Início" },
        { href: "/ser-streamer", label: "Participe" },
        { href: "/crear-agencia", label: "Agência", key: "agencia" },
        { href: "/apps", label: "Apps" },
        { href: "/nosotros", label: "Equipe" },
        { href: "/pagos", label: "Pagamentos" },
        { href: "/ranking", label: "Ranking" },
      ],
    };

    function LangToggle() {
      const { lang, setLang } = useLanguage();
      return (
        <button
          onClick={() => setLang(lang === 'es' ? 'pt' : 'es')}
          title={lang === 'es' ? 'Mudar para português' : 'Cambiar a español'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-purple-500/25 text-purple-300 hover:bg-purple-500/10 transition-all shrink-0"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'es' ? 'PT' : 'ES'}</span>
        </button>
      );
    }

    type PendingItem = { type: string; app: string; name: string };
    type CierreResult = {
      ok: boolean;
      allConfirmed?: boolean;
      pending?: PendingItem[];
      message?: string;
      semana?: string;
      forced?: boolean;
      error?: string;
    };

    function CierreModal({ onClose, force = false }: { onClose: () => void; force?: boolean }) {
      const [phase, setPhase] = useState<'confirm' | 'loading' | 'done'>(force ? 'confirm' : 'loading');
      const [result, setResult] = useState<CierreResult | null>(null);

      function execute(isForce: boolean) {
        setPhase('loading');
        const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/, '');
        fetch(`${apiBase}/api/cierre-semanal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isForce ? { force: true } : {}),
        })
          .then(r => r.json())
          .then((d: CierreResult) => {
            if (d.allConfirmed) {
            try {
              // Clear nomina localStorage so page resets on next load
              localStorage.removeItem('ea_nomina_apps_v1')
              localStorage.setItem('ea_cierre_done_ts', Date.now().toString())
            } catch {}
            window.dispatchEvent(new CustomEvent('ea_cierre_done'));
              window.dispatchEvent(new CustomEvent('ea_rates_cleared'));
          }
            setResult(d);
            setPhase('done');
          })
          .catch(() => {
            setResult({ ok: false, error: 'Error de red' });
            setPhase('done');
          });
      }

      useEffect(() => {
        if (!force) execute(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      function badgeClass(type: string) {
        if (type === 'colider') return 'bg-red-500/15 text-red-300 border-red-500/20';
        if (type === 'agente') return 'bg-amber-500/15 text-amber-300 border-amber-500/20';
        return 'bg-purple-500/15 text-purple-300 border-purple-500/20';
      }

      return (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-20 px-4" onClick={phase === 'loading' ? undefined : onClose}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative bg-[#0d0d1e] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">
              {force ? '⚡ Cierre Forzoso' : 'Cierre de Semana'}
            </p>

            {phase === 'confirm' && (
              <div className="text-center py-4">
                <p className="text-4xl mb-3">⚡</p>
                <p className="text-white font-bold text-lg mb-2">¿Forzar el cierre?</p>
                <p className="text-white/45 text-sm mb-6">Esto cerrará la semana sin verificar si el colider notificó ni si todos confirmaron su pago.</p>
                <button
                  onClick={() => execute(true)}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-all mb-2"
                >
                  Sí, forzar cierre
                </button>
                <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-white/5 text-white/50 text-sm font-semibold hover:text-white hover:bg-white/10 transition-all">
                  Cancelar
                </button>
              </div>
            )}

            {phase === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-white font-semibold text-sm">{force ? 'Ejecutando cierre forzoso...' : 'Verificando pagos...'}</p>
                <p className="text-white/35 text-xs">Por favor espera, no cierres esta ventana</p>
              </div>
            )}

            {phase === 'done' && result?.allConfirmed && (
              <div className="text-center py-4">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-white font-bold text-lg">¡Todo listo!</p>
                <p className="text-white/50 text-sm mt-1">
                  {result.forced ? 'Cierre forzoso completado. Las nóminas han sido limpiadas.' : (result.message ?? 'Todas las personas han confirmado su pago. Las nóminas han sido limpiadas.')}
                </p>
              </div>
            )}

            {phase === 'done' && !result?.allConfirmed && result?.pending && (
              <div>
                <p className="text-amber-400 font-bold mb-1">⚠️ Falta confirmación</p>
                <p className="text-white/40 text-xs mb-3">No se puede cerrar todavía. Esto es lo que falta:</p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.pending.map((p, i) => (
                    <div key={i} className="flex items-start justify-between bg-[#1a1a2e] rounded-xl px-4 py-2.5 gap-3">
                      <div className="min-w-0">
                        <p className="text-white/80 text-sm font-semibold truncate">{p.name}</p>
                        <p className="text-white/40 text-xs">{p.app}</p>
                        {p.phone && (
                          <a
                            href={`https://wa.me/${(p.codigoPais ?? '').replace(/\\D/g,'')}${(p.phone ?? '').replace(/\\D/g,'')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 mt-0.5 text-xs text-green-400 hover:text-green-300 transition-colors"
                          >
                            📱 {p.codigoPais} {p.phone}
                          </a>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${badgeClass(p.type)}`}>
                        {p.type === 'colider_pendiente' ? 'colider' : p.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phase === 'done' && result && !result.allConfirmed && !result.pending && (
              <div className="text-center py-4">
                <p className="text-red-400 font-bold">{result.error ?? 'Error al verificar'}</p>
              </div>
            )}

            {phase === 'done' && (
              <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-xl bg-white/5 text-white/50 text-sm font-semibold hover:text-white hover:bg-white/10 transition-all">
                Cerrar
              </button>
            )}
          </div>
        </div>
      );
    }

    export function Navbar() {
      const [location, navigate] = useLocation();
      const [scrolled, setScrolled] = useState(false);
      const [cierreOpen, setCierreOpen] = useState(false);
      const [forceCierreOpen, setForceCierreOpen] = useState(false);
      const { user, profile, signOut, loading } = useAuth();
      const { lang } = useLanguage();
      const showAgencia = useShowAgencia();
      const isAdmin = profile?.is_admin;
        const isAgent = !!(profile?.is_agent && !profile?.is_admin);
          const isColider = !!(profile?.is_colider && !profile?.is_admin);

      async function handleSignOut() {
        await signOut();
        navigate("/");
      }

      useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
      }, []);

      const publicLinks = NAV_LINKS[lang].filter(
        (l) => l.key !== "agencia" || showAgencia
      );

      const T = {
        miPerfil: lang === 'pt' ? 'Meu perfil' : 'Mi perfil',
        login: lang === 'pt' ? 'Entrar' : 'Iniciar sesión',
        salarios: lang === 'pt' ? 'Salários' : 'Salarios',
        canales: lang === 'pt' ? 'Canais' : 'Canales',
        nomina: lang === 'pt' ? 'Folha' : 'Nómina',
      };

      return (
        <>
          {cierreOpen && <CierreModal onClose={() => setCierreOpen(false)} />}
          {forceCierreOpen && <CierreModal onClose={() => setForceCierreOpen(false)} force={true} />}
          <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#07070f]/95 backdrop-blur-xl border-b border-purple-500/15 shadow-[0_4px_30px_rgba(0,0,0,0.6)]" : "bg-[#07070f]/80 backdrop-blur-md"}`}>

            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href={user ? "/perfil" : "/"} className="flex items-center gap-2 group shrink-0">
                <img src="/images/eclipse-angels-logo.png" alt="Eclipse Angels Agency"
                  className="w-9 h-9 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.6)] group-hover:drop-shadow-[0_0_18px_rgba(168,85,247,0.9)] transition-all duration-300" />
                <div className="leading-tight">
                  <span className="block font-extrabold text-xs tracking-wide uppercase text-white">Eclipse <span className="text-purple-400">Angels</span></span>
                  <span className="block text-[9px] tracking-[0.2em] uppercase text-white/40 font-medium">Agency</span>
                </div>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden lg:flex items-center gap-1">
                {!user && publicLinks.map((l) => (
                  <Link key={l.href + l.label} href={l.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${location === l.href ? "text-white bg-purple-500/15 border border-purple-500/25" : "text-white/55 hover:text-white hover:bg-white/5"}`}>
                    {l.label}
                  </Link>
                ))}

                {!loading && (
                  user ? (
                    <div className="flex items-center gap-1">
                      {isAdmin ? (
                        <>
                          <Link href="/admin"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/admin" ? "text-purple-200 bg-purple-500/15" : "text-purple-300 hover:text-purple-200 hover:bg-purple-500/10"}`}>
                            <Shield className="w-3.5 h-3.5" /> Admin
                          </Link>
                          <Link href="/nomina"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/nomina" ? "text-green-200 bg-green-500/15" : "text-green-400 hover:text-green-300 hover:bg-green-500/10"}`}>
                            <FileSpreadsheet className="w-3.5 h-3.5" /> {T.nomina}
                          </Link>
                          <Link href="/comisiones-agente"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/comisiones-agente" ? "text-amber-200 bg-amber-500/15" : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"}`}>
                            <DollarSign className="w-3.5 h-3.5" /> Comisiones
                          </Link>
                          <button onClick={() => setCierreOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 transition-all">
                            <CheckCircle className="w-3.5 h-3.5" /> Cierre
                          </button>
                          <button onClick={() => setForceCierreOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                            title="Cierre forzoso sin verificar confirmaciones">
                            <Zap className="w-3.5 h-3.5" /> Forzar
                          </button>
                        </>
                      ) : isColider ? (
                          <>
                            <Link href="/agente"
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/agente" ? "text-amber-200 bg-amber-500/15" : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"}`}>
                              <DollarSign className="w-3.5 h-3.5" /> Mi equipo
                            </Link>
                            <Link href="/colider"
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/colider" ? "text-teal-200 bg-teal-500/15" : "text-teal-400 hover:text-teal-300 hover:bg-teal-500/10"}`}>
                              <Users className="w-3.5 h-3.5" /> Colider
                            </Link>
                            <Link href="/salarios"
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/salarios" ? "text-green-200 bg-green-500/15" : "text-green-400 hover:text-green-300 hover:bg-green-500/10"}`}>
                              <DollarSign className="w-3.5 h-3.5" /> {T.salarios}
                            </Link>
                            <Link href="/canales"
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/canales" ? "text-blue-200 bg-blue-500/15" : "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"}`}>
                              <Radio className="w-3.5 h-3.5" /> {T.canales}
                            </Link>
                          </>
                      ) : isAgent ? (
                          <>
                            <Link href="/agente"
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/agente" ? "text-amber-200 bg-amber-500/15" : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"}`}>
                              <DollarSign className="w-3.5 h-3.5" /> Comisiones
                            </Link>
                            <Link href="/salarios"
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/salarios" ? "text-green-200 bg-green-500/15" : "text-green-400 hover:text-green-300 hover:bg-green-500/10"}`}>
                              <DollarSign className="w-3.5 h-3.5" /> {T.salarios}
                            </Link>
                            <Link href="/canales"
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/canales" ? "text-blue-200 bg-blue-500/15" : "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"}`}>
                              <Radio className="w-3.5 h-3.5" /> {T.canales}
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link href="/salarios"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/salarios" ? "text-green-200 bg-green-500/15" : "text-green-400 hover:text-green-300 hover:bg-green-500/10"}`}>
                            <DollarSign className="w-3.5 h-3.5" /> {T.salarios}
                          </Link>
                          <Link href="/canales"
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/canales" ? "text-blue-200 bg-blue-500/15" : "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"}`}>
                            <Radio className="w-3.5 h-3.5" /> {T.canales}
                          </Link>
                        </>
                      )}
                      <Link href="/ranking"
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === "/ranking" ? "text-yellow-200 bg-yellow-500/15" : "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"}`}>
                        <Trophy className="w-3.5 h-3.5" /> Ranking
                      </Link>
                      <Link href="/perfil"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-500/15 border border-purple-500/25 text-white hover:bg-purple-500/25 transition-all">
                        <User className="w-3.5 h-3.5" /> {T.miPerfil}
                      </Link>
                      <button onClick={handleSignOut} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Link href="/login"
                      className="ml-2 px-5 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] hover:shadow-[0_0_25px_rgba(168,85,247,0.55)]">
                      {T.login}
                    </Link>
                  )
                )}
                {loading && <div className="ml-3 w-24 h-8 bg-white/5 rounded-lg animate-pulse" />}

                {/* Language Toggle */}
                <div className="ml-2">
                  <LangToggle />
                </div>
              </nav>

              {/* Mobile right */}
              <div className="lg:hidden flex items-center gap-2">
                <LangToggle />
                {!loading && user ? (
                  <>
                    <button onClick={handleSignOut} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
                      <LogOut className="w-4 h-4" />
                    </button>
                    <Link href="/perfil" className="p-2 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-300">
                      <User className="w-4 h-4" />
                    </Link>
                  </>
                ) : !loading ? (
                  <Link href="/login" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all">{T.login}</Link>
                ) : null}
              </div>
            </div>

            {/* Mobile bottom nav */}
            <nav className="lg:hidden border-t border-white/5 overflow-x-auto scrollbar-none">
              <div className="flex items-center px-2 py-1.5 gap-1 min-w-max">
                {!user && publicLinks.map((l) => (
                  <Link key={l.href + l.label} href={l.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === l.href ? "text-white bg-purple-500/20 border border-purple-500/30" : "text-white/55 hover:text-white hover:bg-white/8"}`}>
                    {l.label}
                  </Link>
                ))}
                {!loading && user && (
                  <>
                    <Link href="/perfil"
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/perfil" ? "text-white bg-purple-500/20 border border-purple-500/30" : "text-white/55 hover:text-white"}`}>
                      <User className="w-3 h-3" /> {T.miPerfil}
                    </Link>
                    {isAdmin ? (
                      <>
                        <Link href="/admin" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/admin" ? "text-purple-200 bg-purple-500/20 border border-purple-500/30" : "text-purple-300 hover:bg-purple-500/10"}`}>
                          <Shield className="w-3 h-3" /> Admin
                        </Link>
                        <Link href="/nomina" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/nomina" ? "text-green-200 bg-green-500/20 border border-green-500/30" : "text-green-400 hover:bg-green-500/10"}`}>
                          <FileSpreadsheet className="w-3 h-3" /> {T.nomina}
                        </Link>
                        <button onClick={() => setCierreOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap text-teal-400 hover:bg-teal-500/10 transition-all">
                          <CheckCircle className="w-3 h-3" /> Cierre
                        </button>
                        <button onClick={() => setForceCierreOpen(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap text-red-400 hover:bg-red-500/10 transition-all">
                          <Zap className="w-3 h-3" /> Forzar
                        </button>
                      </>
                    ) : isColider ? (
                      <>
                        <Link href="/agente" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/agente" ? "text-amber-200 bg-amber-500/20 border border-amber-500/30" : "text-amber-400 hover:bg-amber-500/10"}`}>
                          <DollarSign className="w-3 h-3" /> Mi equipo
                        </Link>
                        <Link href="/colider" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/colider" ? "text-teal-200 bg-teal-500/20 border border-teal-500/30" : "text-teal-400 hover:bg-teal-500/10"}`}>
                          <Users className="w-3 h-3" /> Colider
                        </Link>
                        <Link href="/salarios" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/salarios" ? "text-green-200 bg-green-500/20 border border-green-500/30" : "text-green-400 hover:bg-green-500/10"}`}>
                          <DollarSign className="w-3 h-3" /> {T.salarios}
                        </Link>
                        <Link href="/canales" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/canales" ? "text-blue-200 bg-blue-500/20 border border-blue-500/30" : "text-blue-400 hover:bg-blue-500/10"}`}>
                          <Radio className="w-3 h-3" /> {T.canales}
                        </Link>
                      </>
                    ) : isAgent ? (
                      <>
                        <Link href="/agente" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/agente" ? "text-amber-200 bg-amber-500/20 border border-amber-500/30" : "text-amber-400 hover:bg-amber-500/10"}`}>
                          <DollarSign className="w-3 h-3" /> Comisiones
                        </Link>
                        <Link href="/salarios" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/salarios" ? "text-green-200 bg-green-500/20 border border-green-500/30" : "text-green-400 hover:bg-green-500/10"}`}>
                          <DollarSign className="w-3 h-3" /> {T.salarios}
                        </Link>
                        <Link href="/canales" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/canales" ? "text-blue-200 bg-blue-500/20 border border-blue-500/30" : "text-blue-400 hover:bg-blue-500/10"}`}>
                          <Radio className="w-3 h-3" /> {T.canales}
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link href="/salarios" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/salarios" ? "text-green-200 bg-green-500/20 border border-green-500/30" : "text-green-400 hover:bg-green-500/10"}`}>
                          <DollarSign className="w-3 h-3" /> {T.salarios}
                        </Link>
                        <Link href="/canales" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/canales" ? "text-blue-200 bg-blue-500/20 border border-blue-500/30" : "text-blue-400 hover:bg-blue-500/10"}`}>
                          <Radio className="w-3 h-3" /> {T.canales}
                        </Link>
                      </>
                    )}
                    <Link href="/ranking" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === "/ranking" ? "text-yellow-200 bg-yellow-500/20 border border-yellow-500/30" : "text-yellow-400 hover:bg-yellow-500/10"}`}>
                      <Trophy className="w-3 h-3" /> Ranking
                    </Link>
                  </>
                )}
              </div>
            </nav>

          </header>
        </>
      );
    }
  