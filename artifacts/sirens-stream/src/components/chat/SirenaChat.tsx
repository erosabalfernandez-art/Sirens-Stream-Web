import { useState, useRef, useEffect, useCallback } from "react";
  import { MessageCircle, X, Send, Sparkles, User, Loader2 } from "lucide-react";
  import { AnimatePresence, motion } from "framer-motion";

  const WA_URL = "https://wa.me/5595984381686?text=Hola%2C%20me%20interesa%20saber%20m%C3%A1s%20sobre%20Eclipse%20Angels%20Agency%20%F0%9F%92%99";
  const WELCOME_MSG = "✨ ¡Bienvenida a Eclipse Angels Agency! Soy Ángela. ¿Tienes dudas sobre cómo ganar dinero desde casa? ¡Toca aquí para chatear!";

  const QUICK_REPLIES = [
    "Info sobre Waha",
    "Info sobre Layla",
    "¿Cuánto puedo ganar?",
    "¿Cómo me uno?",
    "¿Es seguro?",
  ];

  type Role = "user" | "assistant";
  interface Msg { role: Role; content: string; }

  export function AngelaChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [showBubble, setShowBubble] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([
      { role: "assistant", content: "¡Hola! Soy Ángela ✨, tu asistente de Eclipse Angels Agency. Estoy aquí para resolver todas tus dudas sobre cómo trabajar con nosotros, las apps disponibles, pagos y mucho más. ¿En qué te puedo ayudar?" },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const show = setTimeout(() => setShowBubble(true), 1000);
      const hide = setTimeout(() => setShowBubble(false), 7000);
      return () => { clearTimeout(show); clearTimeout(hide); };
    }, []);

    useEffect(() => {
      if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const openChat = useCallback(() => { setShowBubble(false); setIsOpen(true); }, []);
    const closeChat = useCallback(() => setIsOpen(false), []);

    const sendMessage = useCallback(async (msg: string) => {
      if (!msg.trim() || isTyping) return;
      const userMsg: Msg = { role: "user", content: msg };
      setMessages(prev => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg, history }),
        });
        const data = await res.json();
        const reply = data.reply || "Lo siento, no pude procesar tu mensaje. Intenta de nuevo.";
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      } catch {
        setMessages(prev => [...prev, { role: "assistant", content: "❌ Error de conexión. Por favor intenta de nuevo o escríbenos por WhatsApp." }]);
      } finally {
        setIsTyping(false);
      }
    }, [isTyping, messages]);

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input.trim()); };

    return (
      <div className="fixed bottom-6 right-5 z-50 flex flex-col items-end">
        <AnimatePresence>
          {showBubble && !isOpen && (
            <motion.button key="bubble" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={openChat}
              className="mb-3 max-w-[250px] text-left bg-[#0a0a16] border border-blue-500/30 rounded-2xl rounded-br-sm px-4 py-3 shadow-xl text-[13px] text-white/85 leading-relaxed cursor-pointer hover:border-blue-400/50 transition-colors">
              {WELCOME_MSG}
              <span className="block mt-1.5 text-[11px] text-blue-400 font-semibold">Toca para chatear →</span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOpen && (
            <motion.div key="chatwindow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="mb-3 bg-[#0a0a16] border border-blue-500/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ width: 350, height: 520 }}>

              <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between select-none shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white leading-none">Ángela — Eclipse Angels IA</p>
                    <p className="text-[11px] text-blue-100/80 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" /> En línea ahora
                    </p>
                  </div>
                </div>
                <button onClick={closeChat} className="text-white/70 hover:text-white p-1 transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-blue-600/30" : "bg-blue-500/20 border border-blue-500/30"}`}>
                      {msg.role === "user" ? <User className="w-3.5 h-3.5 text-blue-300" /> : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-sm" : "bg-[#111125] border border-blue-500/15 text-white/80 rounded-tl-sm"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="bg-[#111125] border border-blue-500/15 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                      {[0, 150, 300].map(d => <div key={d} className="w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {!isTyping && messages.length <= 2 && (
                <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_REPLIES.map(q => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/25 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-3 border-t border-blue-500/10 bg-[#080812] shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    className="flex-1 bg-[#111125] border border-blue-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/40 transition-colors"
                    disabled={isTyping} />
                  <button type="submit" disabled={!input.trim() || isTyping}
                    className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-500 transition-all shrink-0">
                    {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <a href={WA_URL} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-green-600/20 border border-green-500/30 text-green-400 text-[12px] font-semibold hover:bg-green-600/35 hover:border-green-400/50 transition-all">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Hablar con una agente por WhatsApp
                </a>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
          onClick={() => isOpen ? closeChat() : openChat()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.45)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] transition-all text-sm">
          {isOpen ? <X className="w-5 h-5" /> : (<><MessageCircle className="w-5 h-5" /><span>Habla con Ángela</span></>)}
        </motion.button>
      </div>
    );
  }
  