import { motion } from "framer-motion";
import { FaWhatsapp, FaInstagram, FaTiktok, FaFacebook } from "react-icons/fa";

const WA = "https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency";

const socials = [
  {
    href: WA,
    icon: FaWhatsapp,
    label: "WhatsApp",
    bg: "bg-[#25D366]",
    shadow: "rgba(37,211,102,0.5)",
  },
  {
    href: "https://www.instagram.com/eclipse_angels1?igsh=MTY0bGpqd294NjBwYg==",
    icon: FaInstagram,
    label: "Instagram",
    bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
    shadow: "rgba(225,48,108,0.5)",
  },
  {
    href: "https://www.tiktok.com/@eclipse_angels1?_r=1&_t=ZS-96vSGdq3JZ4",
    icon: FaTiktok,
    label: "TikTok",
    bg: "bg-[#010101]",
    shadow: "rgba(255,255,255,0.2)",
  },
  {
    href: "https://facebook.com/eclipseangelsagency",
    icon: FaFacebook,
    label: "Facebook",
    bg: "bg-[#1877F2]",
    shadow: "rgba(24,119,242,0.5)",
  },
];

export function FloatingSocials() {
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-3">
      {socials.map((s, i) => (
        <motion.a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          animate={{ y: [0, -7, 0] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.35,
          }}
          whileHover={{ scale: 1.18, y: -10 }}
          className={`w-11 h-11 rounded-full ${s.bg} flex items-center justify-center text-white`}
          style={{
            boxShadow: `0 4px 18px ${s.shadow}, 0 0 0 2px rgba(255,255,255,0.08)`,
          }}
        >
          <s.icon className="w-5 h-5" />
        </motion.a>
      ))}
    </div>
  );
}
