import { Link, useLocation } from "wouter";
  import { Menu, X } from "lucide-react";
  import { useState, useEffect } from "react";

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
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
      const fn = () => setScrolled(window.scrollY > 10);
      window.addEventListener("scroll", fn);
      return () => window.removeEventListener("scroll", fn);
    }, []);

    useEffect(() => { setIsOpen(false); }, [location]);

    return (
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#07070f]/95 backdrop-blur-xl border-b border-purple-500/15 shadow-[0_4px_30px_rgba(0,0,0,0.6)]" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <img
              src="/images/eclipse-logo-nobg.png"
              alt="Eclipse Angels Agency"
              className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] group-hover:drop-shadow-[0_0_14px_rgba(168,85,247,0.8)] transition-all"
            />
            <div className="leading-tight">
              <span className="block font-extrabold text-sm tracking-wide uppercase text-white">
                Eclipse <span className="text-purple-400">Angels</span>
              </span>
              <span className="block text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">Agency</span>
            </div>
          </Link>

          {/* Desktop nav */}
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

          {/* Mobile toggle */}
          <button className="lg:hidden p-2 text-white/60 hover:text-white" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="lg:hidden bg-[#0a0a14]/98 backdrop-blur-xl border-t border-purple-500/15 px-5 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location === l.href ? "text-white bg-purple-500/15" : "text-white/60 hover:text-white hover:bg-white/5"
                }`}>
                {l.label}
              </Link>
            ))}
            <Link href="/contacto" className="mt-2 px-4 py-3 rounded-lg text-sm font-bold text-center bg-purple-600 text-white hover:bg-purple-500 transition-colors">
              Contacto
            </Link>
          </div>
        )}
      </header>
    );
  }
  