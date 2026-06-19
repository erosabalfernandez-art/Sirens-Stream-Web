import { useState, useEffect, useCallback } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const SEEN_KEY = 'ea_inapp_last_seen';

interface SystemNotif {
  id: string;
  content: string;
  created_at: string;
}

export function InAppNotificationBanner() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<SystemNotif[]>([]);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      let since = '';
      try { since = localStorage.getItem(SEEN_KEY) ?? ''; } catch { /**/ }
      const apiBase = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/$/,'');
      const qs = since ? ('?since=' + encodeURIComponent(since)) : '';
      const res = await fetch(apiBase + '/api/in-app-notifications' + qs);
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: SystemNotif[] };
      if (data.notifications?.length > 0) {
        setNotifs(data.notifications);
        setCurrent(0);
        setVisible(true);
      }
    } catch { /**/ }
  }, [user]);

      useEffect(() => { void fetchNotifs(); }, [fetchNotifs]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => { void fetchNotifs(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [user, fetchNotifs]);

  function dismiss() {
    try { localStorage.setItem(SEEN_KEY, new Date().toISOString()); } catch { /**/ }
    setVisible(false);
    setNotifs([]);
  }

  function next() {
    if (current < notifs.length - 1) setCurrent(c => c + 1);
    else dismiss();
  }

  if (!visible || notifs.length === 0 || !user) return null;
  const notif = notifs[current];

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4">
      <div className="bg-[#0d0d1e] border border-blue-500/40 rounded-2xl shadow-2xl shadow-black/70 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
              {notifs.length > 1 ? ('\uD83D\uDCE2 Comunicado (' + (current + 1) + '/' + notifs.length + ')') : '\uD83D\uDCE2 Comunicado Eclipse Angels'}
            </p>
            <p className="text-sm text-white/85 leading-relaxed">{notif.content}</p>
            <p className="text-[11px] text-white/30 mt-1.5">
              {new Date(notif.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
          <button onClick={dismiss} className="text-white/25 hover:text-white/60 transition-colors mt-0.5 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-white/5">
          {notifs.length > 1 && current < notifs.length - 1 ? (
            <button onClick={next} className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={dismiss} className="text-xs font-bold text-white/40 hover:text-white transition-colors">
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}