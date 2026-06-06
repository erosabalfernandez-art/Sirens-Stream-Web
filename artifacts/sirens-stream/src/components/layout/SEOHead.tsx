import { Helmet } from "react-helmet-async";
  import { useLocation } from "wouter";

  interface PageSEO {
    title: string;
    description: string;
    keywords: string;
  }

  const SEO_DATA: Record<string, PageSEO> = {
    "/": {
      title: "Eclipse Angels Agency | Agencia de Streamers y Chat Hostess",
      description:
        "Únete a Eclipse Angels Agency, agencia líder de streamers en Waha, Layla y Howdy. Trabaja desde casa, gana en dólares sin inversión ni experiencia. Empleo online para mujeres latinas.",
      keywords: [
        "Eclipse Angels Agency",
        "agencia de streamers",
        "agencia de chat hostess",
        "trabajar desde casa",
        "trabajo online sin inversión",
        "trabajo remoto para mujeres",
        "streamers latinas",
        "ganar dinero desde casa",
        "empleo online latinoamérica",
        "trabajo sin experiencia",
        "ganar dólares desde casa",
        "oportunidad de trabajo online",
        "trabajo remoto sin inversión",
        "trabajo para mujeres latinas",
        "agencia Waha",
        "agencia Layla",
        "agencia Howdy",
        "ser streamer",
        "chat hostess trabajo",
        "ingreso pasivo desde casa",
      ].join(", "),
    },

    "/ser-streamer": {
      title: "Cómo Ser Streamer en Waha, Layla y Howdy | Trabajo desde Casa",
      description:
        "Aprende cómo trabajar como streamer en Waha, Layla y Howdy. Trabajo online sin inversión, desde tu celular. Oportunidad real para streamers latinas. Pagos semanales en dólares.",
      keywords: [
        "ser streamer",
        "trabajar en Waha",
        "trabajar en Howdy",
        "trabajar en Layla",
        "cómo ser streamer en Waha",
        "cómo trabajar en Howdy",
        "cómo trabajar en Layla",
        "streamer latina",
        "streamers latinas",
        "trabajo desde casa",
        "trabajo online",
        "trabajo remoto",
        "trabajo sin inversión",
        "trabajo online sin inversión",
        "ganar dinero en Waha",
        "ganar dinero en Howdy",
        "ganar dinero en Layla",
        "ganar dólares desde casa",
        "empleo desde casa",
        "oportunidad de trabajo para mujeres",
        "trabajo remoto latinas",
        "chat hostess Waha",
        "chat hostess Howdy",
        "chat hostess Layla",
        "videollamadas trabajo",
        "live streaming trabajo",
        "trabajo celular desde casa",
        "empleo online sin experiencia",
        "trabajo sin salir de casa",
        "ingresos en dólares",
        "pagos semanales en dólares",
      ].join(", "),
    },

    "/crear-agencia": {
      title: "Crear Agencia de Streamers en Waha, Layla y Howdy | Eclipse Angels",
      description:
        "Crea tu propia agencia de streamers en Waha, Layla y Howdy. Cómo crear una agencia de streamers desde cero, ganar comisiones y construir un negocio online sin inversión con Eclipse Angels Agency.",
      keywords: [
        "crear agencia de streamers",
        "crear agencia Waha",
        "crear agencia Howdy",
        "crear agencia Layla",
        "cómo crear mi primera agencia de streamers",
        "agencia de streamers Waha",
        "agencia de streamers Howdy",
        "agencia de streamers Layla",
        "abrir agencia de streaming",
        "negocio online desde casa",
        "negocio sin inversión",
        "cómo crear agencia streaming",
        "ser manager de streamers",
        "ganar comisiones streamers",
        "ingreso pasivo streamers",
        "crear equipo de streamers",
        "recrutar streamers",
        "gestionar streamers",
        "agencia streaming latinoamérica",
        "agencia Waha Layla Howdy",
        "emprendimiento online",
        "negocio digital desde casa",
        "cómo montar una agencia de streamers",
        "primera agencia de streamers",
        "Eclipse Angels agencia",
        "manager de streaming",
      ].join(", "),
    },

    "/apps": {
      title: "Waha, Layla y Howdy: Apps para Ganar Dinero como Streamer",
      description:
        "Conoce Waha, Layla y Howdy, las mejores apps para ganar dinero como streamer desde casa. Descubre cuál paga más, cómo funcionan y cómo registrarte con Eclipse Angels Agency.",
      keywords: [
        "Waha app",
        "Layla app",
        "Howdy app",
        "apps para ganar dinero",
        "apps de streaming",
        "qué es Waha",
        "qué es Layla app",
        "qué es Howdy app",
        "Waha streaming",
        "Layla streaming",
        "Howdy streaming",
        "apps para streamers latinas",
        "mejor app para ganar dinero desde casa",
        "apps de chat para ganar dinero",
        "plataformas de streaming pago",
        "Waha cómo funciona",
        "Howdy cómo funciona",
        "Layla cómo funciona",
        "registrarse en Waha",
        "registrarse en Howdy",
        "registrarse en Layla",
        "Waha retiro de dinero",
        "Howdy pago semanal",
        "Layla pago en dólares",
        "apps de videollamadas para ganar",
        "apps de audio para ganar dinero",
        "diamantes Waha",
        "monedas Howdy",
        "ganar con Layla",
        "apps trabajo desde celular",
      ].join(", "),
    },

    "/nosotros": {
      title: "Quiénes Somos | Eclipse Angels Agency — Agencia de Streamers",
      description:
        "Eclipse Angels Agency es una agencia de streamers y chat hostess líder en Latinoamérica. Conoce nuestro equipo, misión y por qué somos la mejor opción para trabajar en Waha, Layla y Howdy.",
      keywords: [
        "Eclipse Angels Agency",
        "quiénes somos Eclipse Angels",
        "agencia de streamers latinoamérica",
        "equipo Eclipse Angels",
        "agencia confiable de streaming",
        "mejor agencia de streamers",
        "agencia streamers Waha",
        "agencia streamers Howdy",
        "agencia streamers Layla",
        "agencia oficial Waha",
        "agencia verificada Howdy",
        "nosotros Eclipse Angels",
        "chat hostess agencia",
        "empresa de streaming latina",
      ].join(", "),
    },

    "/pagos": {
      title: "Cómo y Cuándo Cobrar como Streamer en Waha, Layla y Howdy",
      description:
        "Descubre cómo funcionan los pagos en Waha, Layla y Howdy. Retiros semanales en dólares, métodos de cobro disponibles en Latinoamérica y cuánto puedes ganar como streamer.",
      keywords: [
        "cuánto gana un streamer",
        "pagos Waha",
        "pagos Howdy",
        "pagos Layla",
        "cómo cobrar en Waha",
        "cómo cobrar en Howdy",
        "cómo cobrar en Layla",
        "retiro de dinero streaming",
        "cuánto paga Waha",
        "cuánto paga Howdy",
        "cuánto paga Layla",
        "salario streamer",
        "ingresos streamer latina",
        "ganar dólares streaming",
        "pagos semanales streaming",
        "método de pago Waha Layla Howdy",
        "cuánto se gana siendo streamer",
        "sueldo streamer",
        "ganancias streamer",
      ].join(", "),
    },

    "/contacto": {
      title: "Únete o Contáctanos | Eclipse Angels Agency",
      description:
        "¿Quieres ser streamer o crear tu agencia en Waha, Layla o Howdy? Contáctanos. Eclipse Angels Agency te asesora desde el primer día sin costo ni inversión.",
      keywords: [
        "contacto Eclipse Angels Agency",
        "unirme como streamer",
        "aplicar a Eclipse Angels",
        "cómo unirme a Eclipse Angels",
        "aplicar streamer Waha",
        "aplicar streamer Howdy",
        "aplicar streamer Layla",
        "información streamer",
        "asesoría agencia streaming",
        "contacto agencia streamers",
        "quiero ser streamer",
        "quiero crear agencia",
      ].join(", "),
    },

    "/errores-comunes": {
      title: "Errores Comunes al Trabajar en Waha, Howdy y Layla | Eclipse Angels",
      description:
        "Evita los errores más comunes al trabajar como streamer en Waha, Layla y Howdy. Guía práctica de Eclipse Angels Agency para maximizar tus ganancias y evitar suspensiones.",
      keywords: [
        "errores en Waha",
        "errores en Howdy",
        "errores en Layla",
        "por qué me suspendieron en Waha",
        "por qué me banearon en Howdy",
        "errores comunes streamers",
        "cómo no ser baneada en Waha",
        "cómo evitar suspensión Howdy",
        "consejos streamer Waha",
        "consejos streamer Howdy",
        "consejos streamer Layla",
        "guía para streamers",
        "mejorar ganancias streaming",
        "tips para streamers latinas",
        "cómo ganar más en Waha",
        "cómo ganar más en Howdy",
        "cómo ganar más en Layla",
        "problemas comunes streaming",
      ].join(", "),
    },
  };

  const BASE_URL = "https://eclipse-angels-webb.onrender.com";
  const DEFAULT = SEO_DATA["/"];

  export function SEOHead() {
    const [location] = useLocation();
    const seo = SEO_DATA[location] ?? DEFAULT;

    return (
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="keywords" content={seo.keywords} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={`${BASE_URL}${location}`} />
        <meta property="og:site_name" content="Eclipse Angels Agency" />
        <meta name="twitter:title" content={seo.title} />
        <meta name="twitter:description" content={seo.description} />
        <link rel="canonical" href={`${BASE_URL}${location}`} />
      </Helmet>
    );
  }
  