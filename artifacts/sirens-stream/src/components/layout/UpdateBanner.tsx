import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Filter } from 'lucide-react';

export function UpdateBanner() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    navigator.serviceWorker.ready.then((reg) => {
      if (cancelled) return;

      // Already a waiting worker when the page loads (e.g. second tab)
      if (reg.waiting && navigator.serviceWorker.controller) {
        setNeedsUpdate(true);
      }

      // A new service worker was found and installed
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (cancelled) return;
          // 'installed' + existing controller = this is an UPDATE, not first install
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedsUpdate(true);
          }
        });
      });

      // Also trigger a check now (in case the SW already updated in background)
      reg.update().catch(() => {});
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const applyUpdate = useCallback(() => {
    if (updating) return;
    setUpdating(true);
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        // Reload after the new SW takes control
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        }, { once: true });
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    }).catch(() => window.location.reload());
  }, [updating]);

  if (!needsUpdate) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 16px',
        background: 'linear-gradient(135deg, rgba(88,28,135,0.97) 0%, rgba(30,27,75,0.97) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(168,85,247,0.35)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '520px', width: '100%', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: 'rgba(168,85,247,0.25)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <RefreshCw size={14} color="#d8b4fe" />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 500, margin: 0 }}>
            Nueva versión disponible ✨
          </p>
        </div>
        <button
          onClick={applyUpdate}
          disabled={updating}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: updating ? 'rgba(126,34,206,0.6)' : '#7c3aed',
            color: 'white', fontSize: '12px', fontWeight: 700,
            padding: '7px 16px', borderRadius: '10px', border: 'none',
            cursor: updating ? 'not-allowed' : 'pointer',
            flexShrink: 0, opacity: updating ? 0.7 : 1,
            transition: 'background 0.2s',
            boxShadow: '0 2px 12px rgba(124,58,237,0.4)',
          }}
        >
          {updating ? (
            <span style={{
              width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: 'white', borderRadius: '50%',
              display: 'inline-block', animation: 'spin 0.7s linear infinite',
            }} />
          ) : (
            <RefreshCw size={13} />
          )}
          {updating ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
