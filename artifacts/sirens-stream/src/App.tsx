import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FloatingSocials } from "@/components/layout/FloatingSocials";
import { SirenaChat } from "@/components/chat/SirenaChat";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location]);
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
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
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
      <FloatingSocials />
      <SirenaChat />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
