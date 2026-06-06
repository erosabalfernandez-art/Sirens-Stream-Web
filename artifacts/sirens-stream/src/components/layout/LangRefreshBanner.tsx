import { useEffect, useRef, useState } from 'react';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { RefreshCw, X } from 'lucide-react';

  export function LangRefreshBanner() {
    const { lang } = useLanguage();
    const prevLang = useRef<string | null>(null);
    const [show, setShow] = useState(false);
    const [bannerLang, setBannerLang] = useState<'es' | 'pt'>(lang);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
      if (prevLang.current === null) {
        prevLang.current = lang;
        return;
      }
      if (prevLang.current !== lang) {
        prevLang.current = lang;
        setBannerLang(lang);
        setShow(true);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setShow(false), 7000);
      }
    }, [lang]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    if (!show) return null;

    const isPt = bannerLang === 'pt';

    const msg = isPt
      ? 'A página foi atualizada para português. Se não ver as alterações, recarregue.'
      : 'La página se actualizó al español. Si no ves los cambios, recárgala.';
    const btnLabel = isPt ? 'Recarregar' : 'Recargar';

    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-[#12122a] border border-purple-500/40 rounded-2xl px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-md w-[calc(100%-2rem)] max-w-sm">
        <span className="text-white/70 text-xs flex-1 leading-relaxed">{msg}</span>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shrink-0 whitespace-nowrap">
          <RefreshCw className="w-3 h-3" /> {btnLabel}
        </button>
        <button onClick={() => setShow(false)} className="text-white/30 hover:text-white/70 transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }
  