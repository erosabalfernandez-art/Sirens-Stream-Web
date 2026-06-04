import { Link } from "wouter";
import { FaWhatsapp, FaInstagram, FaTiktok, FaFacebook, FaTelegram } from "react-icons/fa";
import { Waves, Mail } from "lucide-react";

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
  { href: "https://wa.me/1234567890", icon: <FaWhatsapp />, label: "WhatsApp", color: "hover:text-[#25D366]" },
  { href: "https://instagram.com/sirensstream", icon: <FaInstagram />, label: "Instagram", color: "hover:text-[#E1306C]" },
  { href: "https://t.me/sirensstream", icon: <FaTelegram />, label: "Telegram", color: "hover:text-[#2CA5E0]" },
  { href: "https://tiktok.com/@sirensstream", icon: <FaTiktok />, label: "TikTok", color: "hover:text-white" },
  { href: "https://facebook.com/sirensstream", icon: <FaFacebook />, label: "Facebook", color: "hover:text-[#1877F2]" },
];

export function Footer() {
  return (
    <footer className="bg-[#050509] border-t border-blue-500/10 mt-auto">
      {/* CTA strip */}
      <div className="border-b border-blue-500/10 py-10">
        <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">¿Lista para empezar a ganar desde casa?</h3>
            <p className="text-white/40 text-sm">Sin inversión · Sin experiencia · Solo tu celular</p>
          </div>
          <Link href="/contacto"
            className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            Contactar Ahora →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-5 w-fit">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Waves className="w-4 h-4 text-blue-400" />
              </div>
              <span className="font-bold text-base uppercase text-white">Sirens<span className="text-blue-400">Stream</span></span>
            </Link>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs">
              Agencia de streaming y chat hostess con más de 3 años conectando mujeres con las mejores plataformas internacionales. Genera ingresos reales desde casa, sin inversión.
            </p>
            <div className="flex items-center gap-1 mt-4 text-white/30 text-xs">
              <Mail className="w-3 h-3" />
              <span>sirensstream@gmail.com</span>
            </div>
          </div>

          {/* Nav columns */}
          {navCols.map((col) => (
            <div key={col.title}>
              <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-white/40 hover:text-blue-400 text-sm transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-8 border-t border-blue-500/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-xs">&copy; {new Date().getFullYear()} Sirens Stream Agency. Todos los derechos reservados.</p>
          <div className="flex items-center gap-3">
            {socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                className={`text-white/30 ${s.color} text-lg transition-colors`} aria-label={s.label}>
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
