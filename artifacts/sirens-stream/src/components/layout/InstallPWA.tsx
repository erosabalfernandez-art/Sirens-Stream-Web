import { useState, useEffect } from "react";
  import { X, Smartphone } from "lucide-react";

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
  }

  export function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
      if (isStandalone()) { setInstalled(true); return; }
      const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
      window.addEventListener('beforeinstallprompt', handler);
      window.addEventListener('appinstalled', () => { setInstalled(true); setDeferredPrompt(null); });
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    if (installed) return null;

    const handleClick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setInstalled(true);
        setDeferredPrompt(null);
      } else {
        setShowModal(true);
      }
    };

    const ios = isIos();

    const iosSteps = [
      ['⚠️', 'Abre en Safari', 'Este proceso solo funciona en Safari (no Chrome ni Firefox)'],
      ['⬆️', 'Toca compartir', 'El ícono de la flecha en la barra inferior de Safari'],
      ['➕', '"Agregar a inicio"', 'Desplázate y selecciona "Agregar a pantalla de inicio"'],
      ['✅', 'Toca Agregar', '¡Ya tendrás el ícono en tu pantalla!'],
    ];
    const androidSteps = [
      ['🌐', 'Abre en Chrome', 'Funciona mejor en Chrome para Android'],
      ['⋮', 'Menú de opciones', 'Toca los 3 puntos arriba a la derecha'],
      ['➕', '"Añadir a pantalla"', 'Selecciona "Añadir a pantalla de inicio"'],
      ['✅', 'Toca Añadir', '¡Ya tendrás el ícono en tu pantalla!'],
    ];
    const steps = ios ? iosSteps : androidSteps;

    return (
      <>
        {/* Floating install button */}
        <button
          onClick={handleClick}
          title="Instalar app"
          style={{
            position: 'fixed',
            bottom: 84,
            right: 16,
            zIndex: 8990,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            padding: '9px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(124,58,237,0.45)',
            whiteSpace: 'nowrap',
          }}
        >
          <Smartphone size={14} />
          Instalar app
        </button>

        {/* Instructions modal */}
        {showModal && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99990, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowModal(false)}
          >
            <div
              style={{ background: '#12121f', borderRadius: '24px 24px 0 0', padding: '28px 24px 36px', maxWidth: 480, width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src="/images/eclipse-angels-logo.png" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} alt="logo" />
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Eclipse Angels</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Instalar en tu dispositivo</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.6)' }}
                >
                  <X size={16} />
                </button>
              </div>

              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {steps.map(([emoji, title, desc], i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#a78bfa', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <div>
                      <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{emoji} {title}</div>
                      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2 }}>{desc}</div>
                    </div>
                  </li>
                ))}
              </ol>

              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 22, textAlign: 'center' }}>
                Una vez instalada podrás activar notificaciones push desde tu perfil
              </p>
            </div>
          </div>
        )}
      </>
    );
  }
  