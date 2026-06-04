import { useState } from "react";
  import { Link } from "wouter";
  import { ChevronDown, ChevronUp, CheckCircle2, Smartphone, Clock, DollarSign, MessageCircle, ArrowRight, X, BookOpen, ExternalLink } from "lucide-react";

  /* ── SVG Icons for apps ── */
  const WahaIcon = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="waha-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff4e6a"/>
          <stop offset="100%" stopColor="#c62a47"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#waha-g)"/>
      <text x="50" y="62" textAnchor="middle" fontSize="52" fontWeight="900" fontFamily="Arial,sans-serif" fill="white">W</text>
    </svg>
  );

  const LaylaIcon = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="layla-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#layla-g)"/>
      <text x="50" y="55" textAnchor="middle" fontSize="22" fontWeight="900" fontFamily="Arial,sans-serif" fill="white" letterSpacing="1">LAYLA</text>
    </svg>
  );

  const DatesIcon = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="dates-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#d97706"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#dates-g)"/>
      <text x="50" y="62" textAnchor="middle" fontSize="42" fontFamily="Arial,sans-serif" fill="white">💛</text>
    </svg>
  );

  const MangoIcon = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mango-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#84cc16"/>
          <stop offset="100%" stopColor="#16a34a"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="22" fill="url(#mango-g)"/>
      <text x="50" y="62" textAnchor="middle" fontSize="42" fontFamily="Arial,sans-serif" fill="white">🥭</text>
    </svg>
  );

  /* ── Data ── */
  const WAHA_GANANCIAS = [
    { categoria: "Mensajes", items: [
      { tipo: "Usuarios VIP", val: "70 diamantes" },
      { tipo: "Usuarios Free", val: "5 puntos" },
    ]},
    { categoria: "Videollamadas Match", items: [
      { tipo: "Usuarios VIP", val: "350 diamantes" },
      { tipo: "Usuarios Free", val: "120 puntos" },
    ]},
    { categoria: "Videollamadas Privadas", items: [
      { tipo: "Por minuto", val: "700 diamantes" },
    ]},
    { categoria: "Regalos", items: [
      { tipo: "Streamers reciben", val: "100% del valor" },
    ]},
  ];

  const WAHA_PAGOS = [
    { concepto: "Meta mínima diamantes", valor: "10,000 = $2.50 USD" },
    { concepto: "Meta mínima puntos", valor: "10,000 = $1.80 USD" },
    { concepto: "Pago semanal", valor: "Martes a Viernes (por agencia)" },
  ];

  const WAHA_SALARIO = [
    { meta: "Tiempo en línea", requisito: "+200 minutos/día" },
    { meta: "Saludos a usuarios", requisito: "+150 usuarios/día" },
    { meta: "Tasa de respuesta", requisito: "+30% en chat" },
  ];

  const WAHA_BONOS = [
    { nombre: "Diamantes en Chat", items: [
      { cant: "10,000 diamantes", usd: "+$0.50 USD" },
      { cant: "30,000 diamantes", usd: "+$2.00 USD" },
      { cant: "100,000 diamantes", usd: "+$10.00 USD" },
    ]},
    { nombre: "Diamantes en Salas de Voz", items: [
      { cant: "2,000 diamantes", usd: "+$0.30 USD" },
      { cant: "10,000 diamantes", usd: "+$1.00 USD" },
      { cant: "30,000 diamantes", usd: "+$3.00 USD" },
      { cant: "100,000 diamantes", usd: "+$15.00 USD" },
    ]},
  ];

  const LAYLA_COINS = [
    { monedas: "15,500", usd: "$1" },
    { monedas: "155,000", usd: "$10" },
    { monedas: "465,000", usd: "$30" },
    { monedas: "775,000", usd: "$50" },
    { monedas: "1,240,000", usd: "$80" },
    { monedas: "1,550,500", usd: "$100" },
    { monedas: "3,101,000", usd: "$200" },
  ];

  const LAYLA_PRICES = [
    { concepto: "Ticket chat mensajes", monedas: "45" },
    { concepto: "SayHi", monedas: "14" },
    { concepto: "Enviar mensaje", monedas: "90" },
  ];

  const apps = [
    {
      id: "waha",
      Icon: WahaIcon,
      name: "Waha",
      tagline: "Mensajes · Salas de Audio · Videollamadas (opcionales)",
      badge: "Solo mensajes",
      badgeColor: "bg-red-500/15 text-red-300 border-red-500/30",
      borderColor: "border-red-500/30",
      accentColor: "text-red-400",
      desc: "Plataforma de interacción completa con usuarios de todo el mundo. Compatible con mensajes de texto, salas de audio grupales y videollamadas opcionales. Alta meta de retiro semanal.",
      specs: [
        { label: "Android", val: "Waha" },
        { label: "iOS", val: "Liyo" },
        { label: "Tiempo diario", val: "+4 horas" },
        { label: "Retiro", val: "Semanal (no acumulable)" },
        { label: "Meta mínima", val: "$2 USD" },
        { label: "Modo", val: "Mensajes, Salas Audio, Videollamadas" },
      ],
      requisitos: ["Mayor de 18 años", "WiFi estable o datos móviles", "Disponible 4–5 horas al día", "Actitud positiva y responsable"],
      guideImage: "/images/waha-guide.png",
      guideImages: ["/images/waha-guide.png"],
      type: "waha",
    },
    {
      id: "layla",
      Icon: LaylaIcon,
      name: "Layla",
      tagline: "Solo Mensajes · Ganancias acumulables · Horario libre",
      badge: "Solo mensajes",
      badgeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      borderColor: "border-purple-500/30",
      accentColor: "text-purple-400",
      desc: "Plataforma de mensajería sin obligación de videollamada, con horarios completamente flexibles y retiro acumulable desde $10 USD. Ideal para quienes buscan trabajar a su propio ritmo.",
      specs: [
        { label: "Android", val: "Layla" },
        { label: "iOS", val: "Nivi" },
        { label: "Tiempo diario", val: "Flexible (pocas horas)" },
        { label: "Retiro", val: "Acumulable" },
        { label: "Meta mínima", val: "$10 USD" },
        { label: "Modo", val: "Solo Mensajes (sin videollamada)" },
      ],
      requisitos: ["Mayor de 18 años", "Smartphone con buena cámara", "WiFi / datos estables", "4–5 horas diarias recomendadas"],
      guideImage: "/images/layla-guide.png",
      guideImages: ["/images/layla-guide.png", "/images/layla-agency-guide.png"],
      type: "layla",
    },
    {
      id: "dates",
      Icon: DatesIcon,
      name: "Dates",
      tagline: "Contenido explícito · Meta mínima de retiro $100",
      badge: "Explícito",
      badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      borderColor: "border-amber-500/30",
      accentColor: "text-amber-400",
      desc: "Plataforma de contenido explícito con alta rentabilidad. Requiere mayor compromiso y tiene una meta mínima de retiro de $100 USD. Solo para streamers mayores de 18 años con experiencia previa.",
      specs: [
        { label: "Tipo", val: "Contenido explícito" },
        { label: "Meta mínima", val: "$100 USD" },
        { label: "Público", val: "Internacional" },
        { label: "Requisito", val: "Mayor de 18 años" },
      ],
      requisitos: ["Mayor de 18 años", "Experiencia previa recomendada", "WiFi estable", "Compromiso alto"],
      guideImage: null,
      guideImages: [],
      type: "other",
    },
    {
      id: "mango",
      Icon: MangoIcon,
      name: "Mango Live",
      tagline: "Videollamadas en vivo · Alto rendimiento",
      badge: "Videollamada",
      badgeColor: "bg-green-500/15 text-green-300 border-green-500/30",
      borderColor: "border-green-500/30",
      accentColor: "text-green-400",
      desc: "Aplicación de alto rendimiento enfocada en videollamadas en vivo. Permite transmitir en directo, interactuar con usuarios y generar ingresos por regalos virtuales y tiempo de transmisión.",
      specs: [
        { label: "Tipo", val: "Lives y videollamadas" },
        { label: "Modo", val: "Transmisión en vivo" },
        { label: "Ingresos", val: "Regalos + tiempo" },
        { label: "Plataforma", val: "Android / iOS" },
      ],
      requisitos: ["Mayor de 18 años", "Buena iluminación y cámara", "WiFi estable", "Disponibilidad para lives"],
      guideImage: null,
      guideImages: [],
      type: "other",
    },
  ];

  /* ── Image Modal ── */
  function GuideModal({ images, onClose }: { images: string[]; onClose: () => void }) {
    const [imgIdx, setImgIdx] = useState(0);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
          <button onClick={onClose}
            className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <img src={images[imgIdx]} alt="Guía de instalación" className="rounded-2xl max-h-[80vh] w-auto object-contain shadow-2xl" />
          {images.length > 1 && (
            <div className="flex gap-3 mt-4">
              {images.map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === imgIdx ? "w-8 bg-blue-400" : "w-4 bg-white/30"}`} />
              ))}
            </div>
          )}
          <p className="text-white/40 text-xs mt-3">Toca fuera para cerrar</p>
        </div>
      </div>
    );
  }

  export default function Apps() {
    const [open, setOpen] = useState<string | null>("waha");
    const [guideModal, setGuideModal] = useState<string[] | null>(null);

    return (
      <div className="min-h-screen bg-[#07070f] text-white pt-16">
        {guideModal && <GuideModal images={guideModal} onClose={() => setGuideModal(null)} />}

        {/* Header */}
        <section className="relative py-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-blue-600/6 blur-[80px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-full px-4 py-1.5 mb-5">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-300 text-xs font-semibold uppercase tracking-wider">Plataformas disponibles</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Catálogo de <span className="gradient-text">Apps</span></h1>
            <p className="text-white/50 max-w-xl mx-auto">
              Trabajamos únicamente con las mejores plataformas internacionales verificadas. Cada app ha sido seleccionada para garantizar pagos seguros y el mayor potencial de ganancias.
            </p>
          </div>
        </section>

        {/* Apps accordion */}
        <section className="pb-20">
          <div className="max-w-3xl mx-auto px-5 space-y-4">
            {apps.map((app) => {
              const isOpen = open === app.id;
              return (
                <div key={app.id}
                  className={`bg-[#0d0d1e] border rounded-2xl overflow-hidden transition-all ${isOpen ? `${app.borderColor} shadow-lg` : "border-blue-500/10"}`}>

                  {/* ── Accordion header ── */}
                  <button className="w-full flex items-start gap-4 p-6 text-left hover:bg-white/[0.02] transition-colors"
                    onClick={() => setOpen(isOpen ? null : app.id)}>
                    <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-md">
                      <app.Icon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h2 className="font-extrabold text-xl">{app.name}</h2>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${app.badgeColor}`}>{app.badge}</span>
                      </div>
                      <p className="text-white/45 text-sm">{app.tagline}</p>
                      <p className="text-white/25 text-xs mt-1.5 line-clamp-2">{app.desc}</p>
                    </div>
                    <div className="shrink-0 mt-1 text-white/30">
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {/* ── Accordion content ── */}
                  {isOpen && (
                    <div className="border-t border-white/5 p-6 space-y-7">
                      {/* Guide + CTA buttons */}
                      <div className="flex flex-wrap gap-3">
                        {app.guideImages.length > 0 && (
                          <button
                            onClick={() => setGuideModal(app.guideImages)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                            <BookOpen className="w-4 h-4" /> Guía de Instalación
                          </button>
                        )}
                        <Link href="/contacto"
                          className="flex items-center gap-2 bg-white/6 border border-white/12 text-white/80 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-white/10 transition-colors">
                          <MessageCircle className="w-4 h-4" /> Contactar Tutora
                        </Link>
                      </div>

                      {/* Description */}
                      <p className="text-white/55 text-sm leading-relaxed">{app.desc}</p>

                      {/* Specs grid */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Información General</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {app.specs.map((s, i) => (
                            <div key={i} className="bg-[#0a0a14] border border-white/5 rounded-xl px-4 py-3">
                              <p className="text-white/30 text-xs mb-1">{s.label}</p>
                              <p className="font-semibold text-sm text-white/85">{s.val}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Requirements */}
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Requisitos Esenciales</h3>
                        <div className="flex flex-wrap gap-2">
                          {app.requisitos.map((r, i) => (
                            <span key={i} className="flex items-center gap-1.5 bg-white/4 border border-white/8 rounded-full px-3 py-1.5 text-xs text-white/60">
                              <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />{r}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* ── WAHA specific ── */}
                      {app.type === "waha" && (
                        <>
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Ganancias por Actividad</h3>
                            <div className="space-y-3">
                              {WAHA_GANANCIAS.map((cat, ci) => (
                                <div key={ci} className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                                  <div className="px-4 py-2.5 bg-white/3 border-b border-white/5">
                                    <span className="text-white/70 text-sm font-bold">{cat.categoria}</span>
                                  </div>
                                  {cat.items.map((item, ii) => (
                                    <div key={ii} className={`flex justify-between items-center px-4 py-3 text-sm ${ii > 0 ? "border-t border-white/5" : ""}`}>
                                      <span className="text-white/50">{item.tipo}</span>
                                      <span className="text-red-300 font-bold">{item.val}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Metas y Pagos</h3>
                            <div className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                              <div className="grid grid-cols-2 text-xs font-bold text-white/30 uppercase tracking-wider px-4 py-2.5 border-b border-white/5">
                                <span>Concepto</span><span className="text-right">Valor</span>
                              </div>
                              {WAHA_PAGOS.map((row, i) => (
                                <div key={i} className={`grid grid-cols-2 px-4 py-3 text-sm ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
                                  <span className="text-white/55">{row.concepto}</span>
                                  <span className="text-right text-red-300 font-semibold">{row.valor}</span>
                                </div>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-white/35 px-1">⚠️ Si el dispositivo ya tuvo cuenta WAHA, no aplica el salario base.</p>
                          </div>

                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-1">Salario Base Inicial</h3>
                            <p className="text-white/40 text-xs mb-3">Disponible solo las primeras 2 semanas — <span className="text-red-300 font-semibold">$1 USD diario</span> por cumplir metas</p>
                            <div className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                              <div className="grid grid-cols-2 text-xs font-bold text-white/30 uppercase tracking-wider px-4 py-2.5 border-b border-white/5">
                                <span>Meta</span><span className="text-right">Requisito</span>
                              </div>
                              {WAHA_SALARIO.map((row, i) => (
                                <div key={i} className={`grid grid-cols-2 px-4 py-3 text-sm ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
                                  <span className="text-white/55">{row.meta}</span>
                                  <span className="text-right text-red-300 font-semibold">{row.requisito}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Bonos Diarios</h3>
                            <div className="space-y-3">
                              {WAHA_BONOS.map((bono, bi) => (
                                <div key={bi} className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                                  <div className="px-4 py-2.5 bg-white/3 border-b border-white/5">
                                    <span className="text-white/70 text-sm font-bold">{bono.nombre}</span>
                                  </div>
                                  {bono.items.map((item, ii) => (
                                    <div key={ii} className={`flex justify-between items-center px-4 py-3 text-sm ${ii > 0 ? "border-t border-white/5" : ""}`}>
                                      <span className="text-white/50">{item.cant}</span>
                                      <span className="text-red-300 font-bold">{item.usd}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                              <p className="text-xs text-white/35 px-1">* Requisito adicional: 5 días con más de 200 minutos en línea.</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── LAYLA specific ── */}
                      {app.type === "layla" && (
                        <>
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Conversión · Monedas → USD</h3>
                            <div className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                              <div className="grid grid-cols-2 text-xs font-bold text-white/30 uppercase tracking-wider px-4 py-2.5 border-b border-white/5">
                                <span>Monedas</span><span className="text-right">USD</span>
                              </div>
                              {LAYLA_COINS.map((row, i) => (
                                <div key={i} className={`grid grid-cols-2 px-4 py-2.5 text-sm ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
                                  <span className="text-white/55">{row.monedas}</span>
                                  <span className="text-right text-purple-300 font-bold">{row.usd}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-2.5 text-xs text-purple-300 font-semibold">
                              META MÍNIMA: 155,000 monedas = $10 USD
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400/70 mb-3">Precios por Actividad</h3>
                            <div className="bg-[#0a0a14] border border-white/5 rounded-xl overflow-hidden">
                              <div className="grid grid-cols-2 text-xs font-bold text-white/30 uppercase tracking-wider px-4 py-2.5 border-b border-white/5">
                                <span>Concepto</span><span className="text-right">Monedas</span>
                              </div>
                              {LAYLA_PRICES.map((row, i) => (
                                <div key={i} className={`grid grid-cols-2 px-4 py-3 text-sm ${i % 2 !== 0 ? "bg-white/[0.015]" : ""}`}>
                                  <span className="text-white/55">{row.concepto}</span>
                                  <span className="text-right text-purple-300 font-bold">{row.monedas}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="max-w-3xl mx-auto px-5 mt-8 text-center">
            <p className="text-white/40 text-sm mb-4">¿No sabes qué app elegir? Nuestro equipo te orienta sin compromiso</p>
            <Link href="/contacto"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-7 py-3 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]">
              Asesoría Gratuita <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    );
  }
  