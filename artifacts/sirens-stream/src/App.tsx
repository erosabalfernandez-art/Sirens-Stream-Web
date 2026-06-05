import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
  import { useEffect } from "react";
  import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
  import { Toaster } from "@/components/ui/toaster";
  import { TooltipProvider } from "@/components/ui/tooltip";
  import { Navbar } from "@/components/layout/Navbar";
  import { Footer } from "@/components/layout/Footer";
  import { FloatingSocials } from "@/components/layout/FloatingSocials";
  import { AngelaChat } from "@/components/chat/SirenaChat";
  import { AuthProvider } from "@/contexts/AuthContext";

  function ScrollToTop() {
    const [location] = useLocation();
    useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [location]);
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

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });

  function Router() {
    return (
      <div className="flex flex-col min-h-screen">
        <ScrollToTop />
        <Navbar />
        <main className="flex-grow flex flex-col pt-14">
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/ser-streamer" component={SerStreamer} />
            <Route path="/crear-agencia" component={CrearAgencia} />
            <Route path="/apps" component={Apps} />
            <Route path="/nosotros" component={Nosotros} />
            <Route path="/pagos" component={Pagos} />
            <Route path="/contacto" component={Contacto} />
            <Route path="/errores-comunes" component={ErroresComunes} />
            <Route path="/login" component={Login} />
            <Route path="/perfil" component={Perfil} />
            <Route path="/admin" component={Admin} />
            <Route path="/nomina" component={Nomina} />
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
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  export default App;
  