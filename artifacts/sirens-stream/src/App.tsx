import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
  import { useEffect } from "react";
  import { HelmetProvider } from "react-helmet-async";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { Toaster } from "@/components/ui/toaster";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { Navbar } from "@/components/layout/Navbar";
  import { InstallPWA } from "@/components/layout/InstallPWA";
  import { UpdateBanner } from "@/components/layout/UpdateBanner";
  import { Footer } from "@/components/layout/Footer";
  import { FloatingSocials } from "@/components/layout/FloatingSocials";
  import { AngelaChat } from "@/components/chat/SirenaChat";
  import { AuthProvider, useAuth } from "@/contexts/AuthContext";
  import { LanguageProvider } from "@/contexts/LanguageContext";
  import { LangRefreshBanner } from "@/components/layout/LangRefreshBanner";
  import { PushPromptBanner } from "@/components/layout/PushPromptBanner";
import { InAppNotificationBanner } from "@/components/layout/InAppNotificationBanner";
  import { SEOHead } from "@/components/layout/SEOHead";
  import Home from "@/pages/home";
  import SerStreamer from "@/pages/ser-streamer";
  import CrearAgencia from "@/pages/crear-agencia";
  import Apps from "@/pages/apps";
  import Nosotros from "@/pages/nosotros";
  import Pagos from "@/pages/pagos";
  import Contacto from "@/pages/contacto";
  import ErroresComunes from "@/pages/errores-comunes";
  import NotFound from "@/pages/not-found";
  import Login from "@/pages/login";
  import Perfil from "@/pages/perfil";
  import Admin from "@/pages/admin";
  import Nomina from "@/pages/nomina";
  import Salarios from "@/pages/salarios";
  import Canales from "@/pages/canales";
  import AgentePanel from "@/pages/agente";
  import Rendimiento from "@/pages/rendimiento";
  import Colider from "@/pages/colider";
import ComisionesAgente from "@/pages/comisiones-agente";
import Ranking from "@/pages/ranking";

  function ScrollToTop() {
    const [location] = useLocation();
    useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [location]);
    return null;
  }

  function RedirectTo({ href }: { href: string }) {
    const [, navigate] = useLocation();
    useEffect(() => { navigate(href); }, []);
    return null;
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });

  /** Visible loading screen - replaces the old invisible text-white/40 approach */
  function LoadingScreen({ message = "Cargando..." }: { message?: string }) {
    return (
      <div
        style={{ minHeight: "100dvh", background: "#07070f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(59,130,246,0.2)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "ea_spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontFamily: "sans-serif", margin: 0 }}>
          {message}
        </p>
        <style>{"@keyframes ea_spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    );
  }

  function Router() {
    const { user, profile, loading } = useAuth();

    useEffect(() => {
      if (!user) queryClient.clear();
    }, [user]);

    if (loading) {
      return <LoadingScreen message="Cargando..." />;
    }

    if (user) {
      if (profile === undefined) {
        return <LoadingScreen message="Cargando perfil..." />;
      }

      return (
        <div className="min-h-screen bg-[#07070f] flex flex-col">
          <ScrollToTop />
          <Navbar />
          <main className="flex-grow flex flex-col pt-24 lg:pt-14">
            <Switch>
              <Route path="/perfil"    component={Perfil} />
              <Route path="/salarios"  component={Salarios} />
              <Route path="/canales"   component={Canales} />
              {profile?.is_admin && <Route path="/admin"   component={Admin} />}
              {profile?.is_admin && <Route path="/nomina"  component={Nomina} />}
              {profile?.is_admin && <Route path="/comisiones-agente" component={ComisionesAgente} />}
              {(profile?.is_agent || profile?.is_colider) && <Route path="/agente" component={AgentePanel} />}
                {(profile?.is_agent || profile?.is_colider) && <Route path="/agente/rendimiento" component={Rendimiento} />}
              {profile?.is_colider && <Route path="/colider" component={Colider} />}
              <Route path="/ranking" component={Ranking} />
              <Route component={() => <RedirectTo href={profile?.is_agent && !profile?.is_admin ? "/agente" : profile?.is_colider && !profile?.is_admin ? "/colider" : "/perfil"} />} />
            </Switch>
          </main>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen">
        <SEOHead />
        <ScrollToTop />
        <Navbar />
        <main className="flex-grow flex flex-col pt-24 lg:pt-14">
          <Switch>
            <Route path="/"                component={Home} />
            <Route path="/ser-streamer"    component={SerStreamer} />
            <Route path="/crear-agencia"   component={CrearAgencia} />
            <Route path="/apps"            component={Apps} />
            <Route path="/nosotros"        component={Nosotros} />
            <Route path="/pagos"           component={Pagos} />
            <Route path="/contacto"        component={Contacto} />
            <Route path="/errores-comunes" component={ErroresComunes} />
            <Route path="/login"           component={Login} />
            <Route path="/ranking"          component={Ranking} />
            <Route component={NotFound} />
          </Switch>
        </main>
        <Footer />
        <FloatingSocials />
        <AngelaChat />
      </div>
    );
  }

  function App() {
    return (
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <LanguageProvider>
              <AuthProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <UpdateBanner />
                <Toaster />
                <InstallPWA />
                <LangRefreshBanner />
                <PushPromptBanner />
                <InAppNotificationBanner />
              </AuthProvider>
            </LanguageProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    );
  }

  export default App;
  