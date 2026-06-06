import { Helmet } from "react-helmet-async";
  import { useLocation } from "wouter";

  const SEO_DATA: Record<string, { title: string; description: string }> = {
    "/": {
      title: "Eclipse Angels Agency | Agencia de Streamers y Chat Hostess",
      description:
        "Únete a Eclipse Angels Agency, la agencia líder de streamers en Waha, Layla y Howdy. Gana dinero desde casa sin inversión ni experiencia previa.",
    },
    "/ser-streamer": {
      title: "Cómo Trabajar como Streamer en Waha, Layla y Howdy | Eclipse Angels",
      description:
        "Aprende cómo ser streamer en Waha, Layla y Howdy. Trabaja desde casa, gana en dólares y recibe pagos semanales sin inversión inicial.",
    },
    "/crear-agencia": {
      title: "Crear Agencia de Streamers en Waha, Layla y Howdy | Eclipse Angels",
      description:
        "Crea tu propia agencia de streamers en Waha, Layla y Howdy. Capacitación completa, herramientas de gestión y respaldo de Eclipse Angels Agency.",
    },
    "/apps": {
      title: "Apps para Streamers: Waha, Layla y Howdy | Eclipse Angels Agency",
      description:
        "Descubre las mejores apps para ganar dinero como streamer: Waha, Layla y Howdy. Trabaja desde tu celular y cobra en dólares cada semana.",
    },
    "/nosotros": {
      title: "Quiénes Somos | Eclipse Angels Agency",
      description:
        "Conoce al equipo de Eclipse Angels Agency, agencia especializada en streamers y chat hostess en Latinoamérica con Waha, Layla y Howdy.",
    },
    "/pagos": {
      title: "Cómo Cobrar como Streamer | Eclipse Angels Agency",
      description:
        "Descubre cómo y cuándo recibes tus pagos como streamer en Waha, Layla y Howdy. Retiros semanales y métodos disponibles en Latinoamérica.",
    },
    "/contacto": {
      title: "Contáctanos | Eclipse Angels Agency",
      description:
        "¿Quieres ser streamer o crear tu agencia en Waha, Layla o Howdy? Contáctanos y un asesor de Eclipse Angels te guiará desde el primer día.",
    },
    "/errores-comunes": {
      title: "Errores Comunes de Streamers en Waha, Layla y Howdy | Eclipse Angels",
      description:
        "Evita los errores más comunes al trabajar en Waha, Layla y Howdy. Guía de Eclipse Angels Agency para maximizar tus ganancias como streamer.",
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
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={`${BASE_URL}${location}`} />
        <link rel="canonical" href={`${BASE_URL}${location}`} />
      </Helmet>
    );
  }
  