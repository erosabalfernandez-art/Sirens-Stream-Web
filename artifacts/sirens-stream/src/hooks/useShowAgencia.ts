import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Returns whether "Crear Agencia" content should be visible.
 * Always returns false for users in Cuba, regardless of the admin toggle.
 */
export function useShowAgencia(): boolean {
  const [showAgencia, setShowAgencia] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 1. Fetch admin toggle from Supabase
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "show_agencia")
        .maybeSingle();
      const toggleOn = data ? data.value !== "false" : true;

      // 2. Geo-check: block Cuba unconditionally
      let isCuba = false;
      try {
        const geo = await fetch("https://api.country.is/", { cache: "no-store" });
        const json = (await geo.json()) as { country?: string };
        isCuba = json.country === "CU";
      } catch {
        // If geo fails, don't block — fail open
        isCuba = false;
      }

      if (!cancelled) setShowAgencia(toggleOn && !isCuba);
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return showAgencia;
}
