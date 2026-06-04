import { Link, useLocation } from "wouter";
    import { useEffect, useState } from "react";

    const links = [
      { href: "/", label: "Home" },
      { href: "/ser-streamer", label: "Únete" },
      { href: "/crear-agencia", label: "Agencia" },
      { href: "/apps", label: "Apps" },
      { href: "/nosotros", label: "Equipo" },
      { href: "/pagos", label: "Pagos" },
    ];

    export function Navbar() {
      const [location] = useLocation();
      const [scrolled, setScrolled] = useState(false);

      useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
      }, []);

      return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#07070f]/95 backdrop-blur-xl border-b border-purple-500/15 shadow-[0_4px_30px_rgba(0,0,0,0.6)]" : "bg-[#07070f]/80 backdrop-blur-md"}`}>

          {/* Top row: Logo + Contacto */}
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group shrink-0">
              <img
                src="/images/eclipse-logo-nobg.png"
                alt="Eclipse Angels Agency"
                className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] group-hover:drop-shadow-[0_0_14px_rgba(168,85,247,0.8)] transition-all"
              />
              <div className="leading-tight">
                <span className="block font-extrabold text-xs tracking-wide uppercase text-white">
                  Eclipse <span className="text-purple-400">Angels</span>
                </span>
                <span className="block text-[9px] tracking-[0.2em] uppercase text-white/40 font-medium">Agency</span>
              </div>
            </Link>

            {/* Desktop nav (hidden on mobile) */}
            <nav className="hidden lg:flex items-center gap-1">
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location === l.href
                      ? "text-white bg-purple-500/15 border border-purple-500/25"
                      : "text-white/55 hover:text-white hover:bg-white/5"
                  }`}>
                  {l.label}
                </Link>
              ))}
              <Link href="/contacto"
                className="ml-3 px-5 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.35)] hover:shadow-[0_0_25px_rgba(168,85,247,0.55)]">
                Contacto
              </Link>
            </nav>

            {/* Contacto button on mobile only */}
            <Link href="/contacto"
              className="lg:hidden px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all">
              Contacto
            </Link>
          </div>

          {/* Mobile bottom nav row — always visible, horizontally scrollable */}
          <nav className="lg:hidden border-t border-white/5 overflow-x-auto scrollbar-none">
            <div className="flex items-center px-2 py-1.5 gap-1 min-w-max">
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    location === l.href
                      ? "text-white bg-purple-500/20 border border-purple-500/30"
                      : "text-white/55 hover:text-white hover:bg-white/8"
                  }`}>
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
      );
    }
  