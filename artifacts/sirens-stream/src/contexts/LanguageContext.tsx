import { createContext, useContext, useState, type ReactNode } from 'react';

type Language = 'es' | 'pt';
interface LangCtx { lang: Language; setLang: (l: Language) => void }
const Ctx = createContext<LangCtx>({ lang: 'es', setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const s = localStorage.getItem('ea_lang');
      return s === 'pt' ? 'pt' : 'es';
    } catch { return 'es'; }
  });
  function setLang(l: Language) {
    setLangState(l);
    try { localStorage.setItem('ea_lang', l); } catch {}
  }
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}

export function useLanguage() { return useContext(Ctx); }
