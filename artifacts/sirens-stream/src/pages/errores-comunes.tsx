import { Link } from "wouter";
  import { motion } from "framer-motion";
  import {AlertTriangle, CheckCircle2, ArrowRight, XCircle, Clock, DollarSign, Heart, Zap, MessageCircle, Shield, TrendingUp, Star} from "lucide-react";
  import { useLanguage } from "@/contexts/LanguageContext";

  type Lang = 'es' | 'pt';

  function getErrores(lang: Lang) {
    return [
      {
        n: "01", icon: AlertTriangle, color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20", accentBg: "bg-red-500/15",
        title:        lang === 'pt' ? "Achar que é um jogo ou passatempo" : "Pensar que es un juego o pasatiempo",
        desc:         lang === 'pt' ? "O erro mais comum e mais caro. Muitas garotas entram achando que isso é 'algo para passar o tempo' e se surpreendem quando não veem resultados. As plataformas têm algoritmos que medem sua atividade: se você não for constante, elas te penalizam reduzindo sua visibilidade." : "El error más común y más costoso. Muchas chicas entran pensando que esto es \"algo para pasar el rato\" y se sorprenden cuando no ven resultados. Las plataformas tienen algoritmos que miden tu actividad: si no eres constante, te penalizan rebajando tu visibilidad.",
        consecuencia: lang === 'pt' ? "Seu perfil perde posicionamento e os usuários param de te encontrar." : "Tu perfil pierde posicionamiento y los usuarios dejan de encontrarte.",
        solucion:     lang === 'pt' ? "Trate como o que é: um trabalho real. Tem horário, tem metas e tem resultados proporcionais ao seu esforço." : "Trátalo como lo que es: un trabajo real. Tiene horario, tiene metas y tiene resultados proporcionales a tu esfuerzo.",
        tips: lang === 'pt' ? ["Crie um horário fixo de trabalho diário", "Coloque alarme como se fosse um emprego", "Anote suas metas semanais e revise-as"] : ["Crea un horario fijo de trabajo diario", "Ponle alarma como si fuera un empleo", "Anota tus metas semanales y revísalas"],
      },
      {
        n: "02", icon: DollarSign, color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20", accentBg: "bg-amber-500/15",
        title:        lang === 'pt' ? "Acreditar que o dinheiro não é real ou não vai chegar" : "Creer que el dinero no es real o que no llegará",
        desc:         lang === 'pt' ? "A desconfiança mata a motivação antes de o dinheiro chegar. Muitas novas desistem na primeira semana porque 'ainda não receberam' sem entender que os pagamentos são semanais e que a primeira semana é de aprendizado e posicionamento de perfil." : "La desconfianza mata la motivación antes de que el dinero llegue. Muchas nuevas se rinden en la primera semana porque 'aún no han cobrado' sin entender que los pagos son semanales y que la primera semana es de aprendizaje y posicionamiento de perfil.",
        consecuencia: lang === 'pt' ? "Abandonam exatamente quando o perfil começa a crescer e os primeiros pagamentos estavam por vir." : "Abandonan justo cuando el perfil empieza a crecer y los primeros pagos estaban por llegar.",
        solucion:     lang === 'pt' ? "Confie no processo. Os pagamentos são reais, em USD, e chegam toda semana. As garotas com mais de um mês já têm vários recebimentos acumulados." : "Confía en el proceso. Los pagos son reales, en USD, y llegan cada semana. Las chicas con más de un mes llevan ya varios cobros acumulados.",
        tips: lang === 'pt' ? ["Espere pelo menos 2 semanas antes de avaliar resultados", "Pergunte à sua tutora quando esperar seu primeiro pagamento", "Guarde prints dos seus ganhos diários para ver o progresso"] : ["Espera mínimo 2 semanas antes de evaluar resultados", "Pregunta a tu tutora cuándo esperar tu primer pago", "Guarda capturas de tus ganancias diarias para ver el progreso"],
      },
      {
        n: "03", icon: Clock, color: "text-blue-400",
        bg: "bg-blue-500/10 border-blue-500/20", accentBg: "bg-blue-500/15",
        title:        lang === 'pt' ? "Não dedicar tempo suficiente" : "No dedicarle tiempo suficiente",
        desc:         lang === 'pt' ? "As plataformas premiam o tempo online. Não é a mesma coisa ficar 1 hora de vez em quando do que ficar 4-5 horas de forma constante. Os algoritmos medem sua atividade diária e recompensam quem cumpre metas de tempo com maior visibilidade e bônus." : "Las plataformas premian el tiempo en línea. No es lo mismo estar 1 hora de vez en cuando que estar 4-5 horas de forma constante. Los algoritmos miden tu actividad diaria y recompensan a las que cumplen metas de tiempo con mayor visibilidad y bonos.",
        consecuencia: lang === 'pt' ? "Ganhos baixos, menos visibilidade na plataforma e acesso limitado a bônus de tempo." : "Bajas ganancias, menos visibilidad en la plataforma y acceso limitado a bonos de tiempo.",
        solucion:     lang === 'pt' ? "Comprometa-se com pelo menos 4 horas diárias. Não precisam ser seguidas — você pode dividir em blocos de manhã e noite." : "Comprométete con al menos 4 horas diarias. No tienen que ser seguidas — puedes dividirlas en bloques de mañana y noche.",
        tips: lang === 'pt' ? ["Mínimo 4 horas diárias para cumprir metas", "Você pode dividir: 2h manhã + 2h noite", "Nos fins de semana há mais usuários ativos — aproveite", "O app mede minutos online — não se desconecte antes de terminar sua meta"] : ["Mínimo 4 horas diarias para cumplir metas", "Puedes dividirlo: 2h mañana + 2h noche", "Los fines de semana hay más usuarios activos — aprovéchalos", "La app mide minutos en línea — no te desconectes sin terminar tu meta"],
      },
      {
        n: "04", icon: XCircle, color: "text-pink-400",
        bg: "bg-pink-500/10 border-pink-500/20", accentBg: "bg-pink-500/15",
        title:        lang === 'pt' ? "Não se esforçar nem ter atitude positiva" : "No ponerle empeño ni actitud positiva",
        desc:         lang === 'pt' ? "A energia que você projeta nas mensagens e interações é perceptível. Os usuários pagam mais e voltam com mais frequência quando sentem que a streamer está genuinamente interessada na conversa. Uma garota apagada, respondendo com monossílabos, ganha muito menos do que uma que interage com entusiasmo." : "La energía que proyectas en los mensajes y en las interacciones se nota. Los usuarios pagan más y regresan más seguido cuando sienten que la streamer está genuinamente interesada en la conversación. Una chica apagada, respondiendo con monosílabos, gana mucho menos que una que interactúa con entusiasmo.",
        consecuencia: lang === 'pt' ? "Usuários que não voltam, baixa taxa de retenção e poucos presentes/diamantes." : "Usuarios que no regresan, baja tasa de retención y pocos regalos/diamantes.",
        solucion:     lang === 'pt' ? "Mesmo que esteja cansada, mantenha energia positiva durante suas horas de trabalho. É parte do trabalho, assim como sorrir em um emprego de atendimento ao cliente." : "Aunque estés cansada, mantén energía positiva durante tus horas de trabajo. Es parte del trabajo, igual que sonreír en un empleo de atención al cliente.",
        tips: lang === 'pt' ? ["Responda com frases completas, não com 'sim', 'não', 'ok'", "Faça perguntas aos usuários para manter a conversa viva", "Use emojis para deixar o chat mais caloroso e pessoal", "Personalize cada conversa — usuários VIP percebem a diferença"] : ["Responde con oraciones completas, no con 'sí', 'no', 'ok'", "Haz preguntas a los usuarios para mantener la conversación viva", "Usa emojis para hacer el chat más cálido y personal", "Personaliza cada conversación — los usuarios VIP notan la diferencia"],
      },
      {
        n: "05", icon: MessageCircle, color: "text-purple-400",
        bg: "bg-purple-500/10 border-purple-500/20", accentBg: "bg-purple-500/15",
        title:        lang === 'pt' ? "Tratar mal os usuários ou ser grossa" : "Tratar mal a los usuarios o ser grosera",
        desc:         lang === 'pt' ? "Esse erro parece óbvio, mas acontece mais do que você imagina, especialmente quando uma usuária recebe mensagens incômodas ou inapropriadas. A reação instintiva pode ser responder de forma ruim — mas nas plataformas isso tem consequências diretas na sua pontuação e visibilidade." : "Este error parece obvio pero ocurre más de lo que imaginas, especialmente cuando una usuaria recibe mensajes incómodos o inapropiados. La reacción instintiva puede ser responder de mala manera — pero en las plataformas esto tiene consecuencias directas en tu puntaje y visibilidad.",
        consecuencia: lang === 'pt' ? "Denúncias de usuários, baixa pontuação do perfil, suspensão temporária ou permanente da conta." : "Reportes de usuarios, baja puntuación del perfil, suspensión temporal o permanente de la cuenta.",
        solucion:     lang === 'pt' ? "Se um usuário ultrapassar os limites, ignore-o ou encerre a conversa de forma educada. Nunca seja grossa nem o insulte. Informe à sua tutora se algo te incomodar." : "Si un usuario se pasa de la raya, ignóralo o cierra la conversación de forma educada. Nunca seas grosera ni lo insultes. Informa a tu tutora si algo te molesta.",
        tips: lang === 'pt' ? ["Ante usuários incômodos: ignore ou encerre sem resposta hostil", "Nunca compartilhe dados pessoais por mais que insistam", "Use a função de bloqueio/denúncia quando necessário", "Sua tutora pode orientá-la sobre como lidar com situações difíceis"] : ["Ante usuarios incómodos: ignora o cierra sin respuesta hostil", "Nunca compartas datos personales por más que insistan", "Usa la función de bloqueo/reporte cuando sea necesario", "Tu tutora puede orientarte sobre cómo manejar situaciones difíciles"],
      },
      {
        n: "06", icon: Shield, color: "text-green-400",
        bg: "bg-green-500/10 border-green-500/20", accentBg: "bg-green-500/15",
        title:        lang === 'pt' ? "Não completar o perfil corretamente" : "No completar el perfil correctamente",
        desc:         lang === 'pt' ? "Um perfil incompleto ou mal configurado é invisível. Muitas garotas se cadastram sem colocar foto real, sem descrição, sem áudio de voz, e se perguntam por que ninguém as contata. A plataforma usa seu perfil para te mostrar aos usuários — um perfil vazio simplesmente não aparece." : "Un perfil incompleto o mal configurado es invisible. Muchas chicas se registran sin poner foto real, sin descripción, sin audio de voz, y se preguntan por qué nadie las contacta. La plataforma utiliza tu perfil para mostrarte a usuarios — un perfil vacío simplemente no aparece.",
        consecuencia: lang === 'pt' ? "Zero ou muito pouca atividade de usuários, poucos ganhos nas primeiras semanas." : "Cero o muy poca actividad de usuarios, pocas ganancias en las primeras semanas.",
        solucion:     lang === 'pt' ? "Dedique a primeira sessão completa para configurar seu perfil 100%: foto real de qualidade, descrição atraente, áudio de voz, álbum com fotos variadas." : "Dedica la primera sesión completa a configurar tu perfil al 100%: foto real de calidad, descripción atractiva, audio de voz, álbum con fotos variadas.",
        tips: lang === 'pt' ? ["Foto de perfil: real, alta qualidade, boa iluminação", "Para Layla: selecione FEMININO desde o início — não pode ser alterado", "Adicione o código da agência antes de começar (Layla: G-84Y3AG7HL)", "Para Howdy: faça upload da capa + 3 fotos de álbum antes de enviar", "Descrição clara e amigável que convide a conversar"] : ["Foto de perfil: real, alta calidad, buena iluminación", "Para Layla: selecciona FEMENINO desde el inicio — no se puede cambiar", "Agrega el código de agencia antes de empezar (Layla: G-84Y3AG7HL)", "Para Howdy: sube cover + 3 fotos de álbum antes de hacer submit", "Descripción clara y amigable que invite a conversar"],
      },
      {
        n: "07", icon: TrendingUp, color: "text-cyan-400",
        bg: "bg-cyan-500/10 border-cyan-500/20", accentBg: "bg-cyan-500/15",
        title:        lang === 'pt' ? "Não aproveitar os bônus e metas diárias" : "No aprovechar los bonos y metas diarias",
        desc:         lang === 'pt' ? "As plataformas têm sistemas de bônus que multiplicam seus ganhos se você cumprir certas metas. Muitas garotas os ignoram porque não os conhecem bem ou porque se contentam com os ganhos base. Os bônus podem representar até 30-50% da renda total de uma semana." : "Las plataformas tienen sistemas de bonos que multiplican tus ganancias si cumples ciertas metas. Muchas chicas los ignoran porque no los conocen bien o porque se conforman con las ganancias base. Los bonos pueden representar hasta el 30-50% de los ingresos totales de una semana.",
        consecuencia: lang === 'pt' ? "Ganhos significativamente menores do que poderia obter com o mesmo tempo de trabalho." : "Ganancias significativamente menores a las que podrías obtener con el mismo tiempo de trabajo.",
        solucion:     lang === 'pt' ? "Aprenda as metas do seu app e planeje sua sessão para cumpri-las. No Waha: tempo online, saudações e taxa de resposta são fundamentais. No Howdy: acumule 180 min online + 150 min em chamadas para o bônus diário de $10 USD." : "Aprende las metas de tu app y planifica tu sesión para cumplirlas. En Waha: tiempo en línea, saludos y tasa de respuesta son claves. En Howdy: acumula 180 min online + 150 min en llamadas para el bono diario de $10 USD.",
        tips: lang === 'pt' ? ["No Waha: mantenha +200 minutos/dia para bônus de tempo", "Cumprimente +150 usuários por dia para ativar bônus de saudações", "Mantenha taxa de resposta +30% no chat", "No Layla: meta diária sugerida = 155.000 moedas = $10 USD", "No Howdy: 180 min online + 150 min em chamadas = bônus diário $10 USD"] : ["En Waha: mantén +200 minutos/día para bono de tiempo", "Saluda a +150 usuarios por día para activar bono de saludos", "Mantén tasa de respuesta +30% en chat", "En Layla: meta diaria sugerida = 155,000 monedas = $10 USD", "En Howdy: 180 min online + 150 min en llamadas = bono diario $10 USD"],
      },
      {
        n: "08", icon: Heart, color: "text-rose-400",
        bg: "bg-rose-500/10 border-rose-500/20", accentBg: "bg-rose-500/15",
        title:        lang === 'pt' ? "Não pedir ajuda" : "No pedir ayuda",
        desc:         lang === 'pt' ? "Muitas garotas têm dúvidas mas não perguntam por vergonha ou por não querer incomodar. Isso faz com que percam tempo tentando resolver sozinhas coisas que a tutora poderia explicar em 2 minutos. A agência existe para apoiá-la — usar esse apoio é parte do trabalho." : "Muchas chicas tienen dudas pero no preguntan por vergüenza o por no querer molestar. Esto hace que pierdan tiempo intentando resolver solas cosas que la tutora podría explicar en 2 minutos. La agencia existe para apoyarte — usar ese apoyo es parte del trabajo.",
        consecuencia: lang === 'pt' ? "Erros que se acumulam, frustração desnecessária e crescimento mais lento." : "Errores que se acumulan, frustración innecesaria y crecimiento más lento.",
        solucion:     lang === 'pt' ? "Sua tutora está disponível para tirar dúvidas. Qualquer problema — técnico, de comportamento de usuário, de plataforma — pode ser resolvido mais rapidamente com ajuda." : "Tu tutora está disponible para resolver dudas. Cualquier problema — técnico, de comportamiento de usuario, de plataforma — se resuelve más rápido con ayuda.",
        tips: lang === 'pt' ? ["Mande mensagem para sua tutora quando travar em algo", "Documente suas dúvidas para resolvê-las todas de uma vez", "Não hesite: nenhuma pergunta é idiota no início", "Revise regularmente os tutoriais da agência na seção Apps"] : ["Manda mensaje a tu tutora cuando te trabas con algo", "Documenta tus dudas para resolverlas todas de una vez", "No dudes: ninguna pregunta es tonta al principio", "Revisa periódicamente los tutoriales de la agencia en la sección Apps"],
      },
    ];
  }

  export default function ErroresComunes() {
    const { lang } = useLanguage();
    const errores = getErrores(lang);

    const T = {
      badge:       lang === 'pt' ? 'Guia Prático'                                       : 'Guía Práctica',
      title1:      lang === 'pt' ? 'Os 8 Erros Que'                                      : 'Los 8 Errores Que Te',
      title2:      lang === 'pt' ? 'Custam Dinheiro'                                     : 'Cuestan Dinero',
      subtitle:    lang === 'pt' ? 'Erros que as novas streamers cometem e como evitá-los desde o início.' : 'Errores que cometen las streamers nuevas y cómo evitarlos desde el principio.',
      consecuencia:lang === 'pt' ? 'Consequência'                                        : 'Consecuencia',
      solucion:    lang === 'pt' ? 'Solução'                                             : 'Solución',
      tipsLabel:   lang === 'pt' ? 'Dicas Práticas'                                      : 'Tips Prácticos',
      ctaTitle:    lang === 'pt' ? 'Pronta para evitar esses erros?'                     : '¿Lista para evitar estos errores?',
      ctaDesc:     lang === 'pt' ? 'Nossa agência te acompanha desde o primeiro dia — tutora dedicada, guias passo a passo e suporte diário.' : 'Nuestra agencia te acompaña desde el primer día — tutora dedicada, guías paso a paso y soporte diario.',
      ctaBtn:      lang === 'pt' ? 'Quero entrar agora'                                  : 'Quiero unirme ahora',
      appsBtn:     lang === 'pt' ? 'Ver Apps'                                            : 'Ver Apps',
    };

    return (
      <div className="min-h-screen bg-[#07070f] text-white">
        {/* Hero */}
        <section className="relative pt-28 pb-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-red-600/5 blur-[100px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-full px-4 py-1.5 mb-5">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-300 text-xs font-semibold uppercase tracking-wider">{T.badge}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                {T.title1} <br /><span className="text-red-400">{T.title2}</span>
              </h1>
              <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">{T.subtitle}</p>
            </motion.div>
          </div>
        </section>

        {/* Errores */}
        <section className="pb-20">
          <div className="max-w-4xl mx-auto px-5 space-y-6">
            {errores.map((e, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5, delay: i * 0.04 }}
                className={`bg-[#0d0d1e] border ${e.bg} rounded-2xl overflow-hidden`}>
                <div className="p-6 md:p-8">
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`w-10 h-10 rounded-xl ${e.accentBg} flex items-center justify-center shrink-0`}>
                      <e.icon className={`w-5 h-5 ${e.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-black tracking-wider ${e.color} opacity-60`}>{e.n}</span>
                        <h2 className="text-lg md:text-xl font-extrabold leading-tight">{e.title}</h2>
                      </div>
                      <p className="text-white/55 leading-relaxed">{e.desc}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider text-red-400/70">{T.consecuencia}</span>
                      </div>
                      <p className="text-white/60 text-sm leading-relaxed">{e.consecuencia}</p>
                    </div>
                    <div className="bg-green-500/8 border border-green-500/15 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        <span className="text-xs font-bold uppercase tracking-wider text-green-400/70">{T.solucion}</span>
                      </div>
                      <p className="text-white/60 text-sm leading-relaxed">{e.solucion}</p>
                    </div>
                  </div>

                  {e.tips.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-white/25 mb-2.5 flex items-center gap-1.5">
                        <Zap className="w-3 h-3" /> {T.tipsLabel}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {e.tips.map((tip, j) => (
                          <span key={j} className="text-xs bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-white/50">
                            {tip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-24">
          <div className="max-w-3xl mx-auto px-5">
            <div className="bg-gradient-to-br from-purple-600/15 to-blue-600/8 border border-purple-500/20 rounded-3xl p-10 text-center">
              <Star className="w-10 h-10 text-purple-400 mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-extrabold mb-3">{T.ctaTitle}</h2>
              <p className="text-white/50 max-w-xl mx-auto mb-8 leading-relaxed">{T.ctaDesc}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://wa.me/5595984381686?text=Hola%2C%20quiero%20unirme%20a%20Eclipse%20Angels%20Agency"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(168,85,247,0.4)]">
                  {T.ctaBtn} <ArrowRight className="w-4 h-4" />
                </a>
                <Link href="/apps"
                  className="flex items-center gap-2 bg-white/6 border border-white/12 text-white font-bold px-7 py-4 rounded-xl text-sm hover:bg-white/10 transition-colors">
                  {T.appsBtn}
                </Link>
              </div>
            </div>
          </div>
        </section>
      {/* SEO keywords */}
      <section aria-hidden="true" className="px-6 pb-6 max-w-5xl mx-auto">
        <p className="text-[9px] text-white/15 leading-relaxed select-none">
          errores en Waha · errores en Howdy · errores en Layla · por qué me suspendieron en Waha · por qué me banearon en Howdy · errores comunes streamers · cómo no ser baneada en Waha · cómo evitar suspensión Howdy · consejos streamer Waha · consejos streamer Howdy · consejos streamer Layla · guía para streamers · mejorar ganancias streaming · tips para streamers latinas · cómo ganar más en Waha · cómo ganar más en Howdy · cómo ganar más en Layla · problemas comunes streaming · advertencias Waha · reglas Howdy
        </p>
      </section>
      </div>
    );
  }
  