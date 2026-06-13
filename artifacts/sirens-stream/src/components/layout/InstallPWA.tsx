import { useState, useEffect, useRef } from "react";
  import { X, Smartphone, RefreshCw } from "lucide-react";

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
  }

  const STORAGE_KEY = "pwa-btn-pos";

  function getSavedPos() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  }

  function clampPos(x: number, y: number, btnW: number, btnH: number) {
    return {
      x: Math.max(4, Math.min(x, window.innerWidth - btnW - 4)),
      y: Math.max(4, Math.min(y, window.innerHeight - btnH - 4)),
    };
  }

  export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(
      () => (window as any).__pwaPrompt ?? null
    );
    const [showModal, setShowModal] = useState(false);
    const [installed, setInstalled] = useState(
      () => isStandalone() || !!((window as any).__pwaInstalled)
    );

    const btnRef = useRef<HTMLButtonElement>(null);
    const posRef = useRef(getSavedPos() ?? { x: 12, y: window.innerHeight - 140 });
    const [pos, setPos] = useState(posRef.current);

    useEffect(() => {
      if ((window as any).__pwaPrompt) setDeferredPrompt((window as any).__pwaPrompt);
      const onPrompt = (e: any) => { e.preventDefault(); (window as any).__pwaPrompt = e; setDeferredPrompt(e); };
      const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); (window as any).__pwaPrompt = undefined; };
      window.addEventListener("beforeinstallprompt", onPrompt);
      window.addEventListener("appinstalled", onInstalled);
      return () => {
        window.removeEventListener("beforeinstallprompt", onPrompt);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }, []);

    const handlePointerDown = (e: React.PointerEvent) => {
      e.preventDefault();
      const btn = btnRef.current;
      if (!btn) return;

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startX = posRef.current.x;
      const startY = posRef.current.y;
      const btnW = btn.offsetWidth;
      const btnH = btn.offsetHeight;
      let moved = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) moved = true;
        if (!moved) return;
        const newPos = clampPos(startX + dx, startY + dy, btnW, btnH);
        posRef.current = newPos;
        setPos({ ...newPos });
      };

      const onUp = async (ev: PointerEvent) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);

        if (moved) {
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current)); } catch {}
          return;
        }

        // Tap — trigger install action
        if (deferredPrompt && !installed) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === "accepted") setInstalled(true);
          setDeferredPrompt(null);
          (window as any).__pwaPrompt = undefined;
        } else {
          setShowModal(true);
        }
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    };

    const ios = isIos();
    const iosSteps = [
      ["⚠️", "Abre en Safari", "Este proceso solo funciona en Safari (no Chrome ni Firefox)"],
      ["⬆️", "Toca compartir", "El ícono de la flecha en la barra inferior de Safari"],
      ["➕", "\"Agregar a inicio\"", "Desplázate y selecciona \"Agregar a pantalla de inicio\""],
      ["✅", "Toca Agregar", "¡Ya tendrás el ícono en tu pantalla!"],
    ];
    const androidSteps = [
      ["🦊", "Abre en Firefox", "Descarga Firefox gratis y abre la página en Firefox — recomendado para recibir notificaciones"],
      ["⋮", "3 puntitos arriba a la derecha", "Toca los 3 puntos en la esquina superior derecha de Firefox"],
      ["➕", "Toca \"MÁS\"", "En el menú que se abre, busca y toca \"MÁS\""],
      ["🏠", "\"Añadir a pantalla de inicio\"", "Selecciona esa opción y acepta todo lo que te pida — ¡listo!"],
    ];
    const steps = ios ? iosSteps : androidSteps;

    return (
      <>
        <button
          ref={btnRef}
          onPointerDown={handlePointerDown}
          title={installed ? "Reinstalar app" : "Instalar app"}
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y,
            zIndex: 8990,
            background: installed
              ? "linear-gradient(135deg, #374151, #1f2937)"
              : "linear-gradient(135deg, #7c3aed, #4f46e5)",
            color: "white",
            border: installed ? "1px solid rgba(255,255,255,0.12)" : "none",
            borderRadius: "50px",
            padding: "7px 12px",
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "grab",
            boxShadow: installed
              ? "0 2px 10px rgba(0,0,0,0.4)"
              : "0 4px 18px rgba(124,58,237,0.45)",
            whiteSpace: "nowrap",
            opacity: 0.9,
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {installed ? <RefreshCw size={12} /> : <Smartphone size={12} />}
          {installed ? "Reinstalar app" : "Instalar app"}
        </button>

        {showModal && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99990, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{ background: "#12121f", borderRadius: "24px 24px 0 0", padding: "28px 24px 36px", maxWidth: 480, width: "100%", borderTop: "1px solid rgba(255,255,255,0.08)" }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src="/images/eclipse-angels-logo.png" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover" }} alt="logo" />
                  <div>
                    <div style={{ color: "white", fontWeight: 700, fontSize: 15 }}>Eclipse Angels</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                      {installed ? "Reinstalar en tu dispositivo" : "Instalar en tu dispositivo"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
                >
                  <X size={16} />
                </button>
              </div>

              {installed && (
                <div style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 18 }}>
                  <p style={{ color: "#c4b5fd", fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    💡 Para reinstalar: elimina el ícono actual de tu pantalla de inicio, luego abre la página en Firefox y sigue los pasos para volver a instalarla y recibir notificaciones correctamente.
                  </p>
                </div>
              )}

              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                {steps.map(([emoji, title, desc], i) => (
                  <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#a78bfa", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <div>
                      <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{emoji} {title}</div>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 2 }}>{desc}</div>
                    </div>
                  </li>
                ))}
              </ol>

              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 22, textAlign: "center" }}>
                  Una vez instalada con Firefox recibirás notificaciones aunque el navegador esté cerrado, incluso en Cuba
                </p>

                {!ios && (
                  <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: 12, padding: "12px 14px", marginTop: 14 }}>
                    <p style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700, margin: "0 0 8px 0" }}>
                      🔋 Paso extra importante — Batería
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "0 0 6px 0", lineHeight: 1.5 }}>
                      Android apaga Firefox en segundo plano y bloquea las notificaciones. Hazlo una sola vez:
                    </p>
                    <ol style={{ margin: 0, padding: "0 0 0 16px", color: "rgba(255,255,255,0.6)", fontSize: 11, lineHeight: 1.9 }}>
                      <li>⚙️ Ajustes del teléfono</li>
                      <li>📱 Aplicaciones → Firefox</li>
                      <li>🔋 Batería</li>
                      <li>✅ Elige <strong style={{ color: "#fbbf24" }}>"Sin restricciones"</strong></li>
                    </ol>
                  </div>
                )}
            </div>
          </div>
        )}
      </>
    );
  }
  