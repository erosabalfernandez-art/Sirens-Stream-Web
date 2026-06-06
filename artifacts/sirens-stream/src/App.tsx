import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
  import { useEffect } from "react";
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

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });

  function Router() {
    const { user, profile, loading } = useAuth();

    // Clear React Query cache when user logs out to prevent stale auth data
    useEffect(() => {
      if (!user) queryClient.clear();
    }, [user]);

    if (loading) {
      return (
        <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
          <div className="text-white/40 animate-pulse text-sm">Cargando...</div>
        </div>
      );
    }

    if (user) {
      // Wait for profile to finish loading before deciding which routes exist.
      // Without this, navigating to /admin or /nomina while profile is still
      // undefined causes the catch-all to fire and redirect to /perfil.
      if (profile === undefined) {
        return (
          <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
            <div className="text-white/40 animate-pulse text-sm">Cargando perfil...</div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-[#07070f] flex flex-col">
          <ScrollToTop />
          <Navbar />
          <main className="flex-grow flex flex-col pt-14">
            <Switch>
              <Route path="/perfil"    component={Perfil} />
              <Route path="/salarios"  component={Salarios} />
              <Route path="/canales"   component={Canales} />
              {profile?.is_admin && <Route path="/admin"   component={Admin} />}
              {profile?.is_admin && <Route path="/nomina"  component={Nomina} />}
              <Route component={() => <RedirectTo href="/perfil" />} />
            </Switch>
          </main>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen">
        <ScrollToTop />
        <Navbar />
        <main className="flex-grow flex flex-col pt-14">
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
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <UpdateBanner />
            <Toaster />
            <InstallPWA />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  export default App;
