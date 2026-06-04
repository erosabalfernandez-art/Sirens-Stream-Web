import { Link, useLocation } from "wouter";
import { Menu, X, Waves } from "lucide-react";
import { useState, useEffect } from "react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/ser-streamer", label: "Ser Streamer" },
  { href: "/crear-agencia", label: "Crear Agencia" },
  { href: "/apps", label: "Apps" },
  { href: "/nosotros", label: "Nosotros" },
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
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[#07070f]/95 backdrop-blur-xl border-b border-blue-500/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors glow-blue">
            <Waves className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <span className="font-bold text-base tracking-wide uppercase text-white">
            Sirens<span className="text-blue-400">Stream</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                location === l.href
                  ? "text-white bg-blue-500/15 border border-blue-500/25"
                  : "text-white/55 hover:text-white hover:bg-white/5"
              }`}>
              {l.label}
            </Link>
          ))}
          <Link href="/contacto"
            className="ml-3 px-5 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]">
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
        <div className="lg:hidden bg-[#0a0a14]/98 backdrop-blur-xl border-t border-blue-500/10 px-5 py-4 flex flex-col gap-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                location === l.href ? "text-white bg-blue-500/15" : "text-white/60 hover:text-white hover:bg-white/5"
              }`}>
              {l.label}
            </Link>
          ))}
          <Link href="/contacto" className="mt-2 px-4 py-3 rounded-lg text-sm font-bold text-center bg-blue-600 text-white hover:bg-blue-500 transition-colors">
            Contacto
          </Link>
        </div>
      )}
    </header>
  );
}
