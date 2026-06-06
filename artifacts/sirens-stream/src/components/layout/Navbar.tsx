import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, LogOut, Shield, FileSpreadsheet, DollarSign, Radio } from "lucide-react";

const PUBLIC_LINKS = [
  { href: "/", label: "Home" },
  { href: "/ser-streamer", label: "Únete" },
  { href: "/crear-agencia", label: "Agencia", key: "agencia" },
  { href: "/apps", label: "Apps" },
  { href: "/nosotros", label: "Equipo" },
  { href: "/pagos", label: "Pagos" },
];

export function Navbar() {
  const [location, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const { user, profile, signOut, loading } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }
  const showAgencia = useShowAgencia();

  const isAdmin = profile?.is_admin;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const publicLinks = PUBLIC_LINKS.filter(
    (l) => l.key !== "agencia" || showAgencia
  );

  return (
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
            <Link key={l.href} href={l.href}
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
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === '/admin' ? 'text-purple-200 bg-purple-500/15' : 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/10'}`}>
                      <Shield className="w-3.5 h-3.5" /> Admin
                    </Link>
                    <Link href="/nomina"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === '/nomina' ? 'text-green-200 bg-green-500/15' : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'}`}>
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Nómina
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/salarios"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === '/salarios' ? 'text-green-200 bg-green-500/15' : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'}`}>
                      <DollarSign className="w-3.5 h-3.5" /> Salarios
                    </Link>
                    <Link href="/canales"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${location === '/canales' ? 'text-blue-200 bg-blue-500/15' : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'}`}>
                      <Radio className="w-3.5 h-3.5" /> Canales
                    </Link>
                  </>
                )}
                <Link href="/perfil"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-500/15 border border-purple-500/25 text-white hover:bg-purple-500/25 transition-all">
                  <User className="w-3.5 h-3.5" /> Mi perfil
                </Link>
                <button onClick={handleSignOut} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link href="/login"
                className="ml-3 px-5 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] hover:shadow-[0_0_25px_rgba(168,85,247,0.55)]">
                Iniciar sesión
              </Link>
            )
          )}
          {loading && <div className="ml-3 w-24 h-8 bg-white/5 rounded-lg animate-pulse" />}
        </nav>

        {/* Mobile right */}
        <div className="lg:hidden flex items-center gap-2">
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
            <Link href="/login" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all">Entrar</Link>
          ) : null}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden border-t border-white/5 overflow-x-auto scrollbar-none">
        <div className="flex items-center px-2 py-1.5 gap-1 min-w-max">
          {!user && publicLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === l.href ? "text-white bg-purple-500/20 border border-purple-500/30" : "text-white/55 hover:text-white hover:bg-white/8"}`}>
              {l.label}
            </Link>
          ))}
          {!loading && user && (
            <>
              <Link href="/perfil"
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === '/perfil' ? 'text-white bg-purple-500/20 border border-purple-500/30' : 'text-white/55 hover:text-white'}`}>
                <User className="w-3 h-3" /> Mi Perfil
              </Link>
              {isAdmin ? (
                <>
                  <Link href="/admin" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === '/admin' ? 'text-purple-200 bg-purple-500/20 border border-purple-500/30' : 'text-purple-300 hover:bg-purple-500/10'}`}>
                    <Shield className="w-3 h-3" /> Admin
                  </Link>
                  <Link href="/nomina" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === '/nomina' ? 'text-green-200 bg-green-500/20 border border-green-500/30' : 'text-green-400 hover:bg-green-500/10'}`}>
                    <FileSpreadsheet className="w-3 h-3" /> Nómina
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/salarios" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === '/salarios' ? 'text-green-200 bg-green-500/20 border border-green-500/30' : 'text-green-400 hover:bg-green-500/10'}`}>
                    <DollarSign className="w-3 h-3" /> Salarios
                  </Link>
                  <Link href="/canales" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${location === '/canales' ? 'text-blue-200 bg-blue-500/20 border border-blue-500/30' : 'text-blue-400 hover:bg-blue-500/10'}`}>
                    <Radio className="w-3 h-3" /> Canales
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
