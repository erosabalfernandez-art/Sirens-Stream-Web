import { Link } from "wouter";
  import { FaWhatsapp, FaInstagram, FaTiktok, FaFacebook } from "react-icons/fa";
  import { Mail } from "lucide-react";

  const navCols = [
    {
      title: "Plataforma",
      links: [
        { href: "/ser-streamer", label: "Ser Streamer" },
        { href: "/crear-agencia", label: "Crear Agencia" },
        { href: "/apps", label: "Catálogo de Apps" },
        { href: "/pagos", label: "Métodos de Pago" },
      ],
    },
    {
      title: "Agencia",
      links: [
        { href: "/nosotros", label: "Sobre Nosotros" },
        { href: "/contacto", label: "Contacto" },
        { href: "/nosotros", label: "FAQ" },
      ],
    },
  ];

  const socials = [
    { href: "https://www.instagram.com/eclipse_angels.agency?igsh=bW9mczJiNG1lOG1h", icon: <FaInstagram />, label: "Instagram", color: "text-[#E1306C] hover:opacity-80" },
    { href: "https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency", icon: <FaWhatsapp />, label: "WhatsApp", color: "text-[#25D366] hover:opacity-80" },
    { href: "https://www.tiktok.com/@eclipse_angels1?_r=1&_t=ZS-96vSGdq3JZ4", icon: <FaTiktok />, label: "TikTok", color: "text-white hover:opacity-80" },
    { href: "https://facebook.com/eclipseangelsagency", icon: <FaFacebook />, label: "Facebook", color: "text-[#1877F2] hover:opacity-80" },
  ];

  export function Footer() {
    return (
      <footer className="bg-[#050509] border-t border-purple-500/10 mt-auto">
        {/* CTA strip */}
        <div className="border-b border-purple-500/10 py-10">
          <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">¿Lista para empezar a ganar desde casa?</h3>
              <p className="text-white/40 text-sm">Sin inversión · Sin experiencia · Solo tu celular</p>
            </div>
            <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency" target="_blank" rel="noopener noreferrer"
              className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]">
              Contactar Ahora →
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-5 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-5 w-fit group">
                <img
                  src="/images/eclipse-angels-logo.png"
                  alt="Eclipse Angels Agency"
                  className="w-10 h-10 object-contain drop-shadow-[0_0_6px_rgba(168,85,247,0.4)] group-hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.7)] transition-all"
                />
                <div className="leading-tight">
                  <span className="block font-extrabold text-sm tracking-wide uppercase text-white">Eclipse <span className="text-purple-400">Angels</span></span>
                  <span className="block text-[10px] tracking-[0.2em] uppercase text-white/40 font-medium">Agency</span>
                </div>
              </Link>
              <p className="text-white/45 text-sm leading-relaxed max-w-xs">
                Agencia de streaming y chat hostess conectando mujeres con las mejores plataformas internacionales. Genera ingresos reales desde casa, sin inversión.
              </p>
              <div className="flex items-center gap-1 mt-4 text-white/30 text-xs">
                <Mail className="w-3 h-3" />
                <span>eclipseangelsagency@gmail.com</span>
              </div>
            </div>

            {/* Nav columns */}
            {navCols.map((col) => (
              <div key={col.title}>
                <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-white/40 hover:text-purple-400 text-sm transition-colors">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom */}
          <div className="mt-10 pt-8 border-t border-purple-500/8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/25 text-xs">&copy; {new Date().getFullYear()} Eclipse Angels Agency. Todos los derechos reservados.</p>
            <div className="flex items-center gap-3">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className={`${s.color} text-xl transition-opacity`} aria-label={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    );
  }
  