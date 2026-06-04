import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { useSendChatMessage } from "@/lib/api-client";
import type { ChatMessage } from "@/lib/api-client";

const WELCOME_MESSAGE = "✨ ¡Bienvenida a Eclipse Angels Agency! Soy Ángela, tu asistente virtual. ¿Tienes dudas sobre cómo ganar dinero desde casa? ¡Estoy aquí para ayudarte!";

export function SirenaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "¡Hola! Soy Ángela ✨, tu asistente en Eclipse Angels Agency. Estoy aquí para resolver todas tus dudas sobre cómo trabajar con nosotros, las apps disponibles, pagos y mucho más. ¿En qué te puedo ayudar?" }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatMutation = useSendChatMessage();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setShowWelcome(true);
      setIsOpen(true);
    }, 800);
    const timer2 = setTimeout(() => {
      if (!hasInteracted) {
        setIsOpen(false);
        setShowWelcome(false);
      }
    }, 5800);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasInteracted(true);
    setShowWelcome(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setHasInteracted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;
    setHasInteracted(true);
    const userMsg = input.trim();
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setInput("");
    const history = messages.filter(m => m.role === "user" || m.role === "assistant");
    chatMutation.mutate(
      { data: { message: userMsg, history } },
      {
        onSuccess: (res) => setMessages(prev => [...prev, { role: "assistant", content: res.reply }]),
        onError: () => setMessages(prev => [...prev, { role: "assistant", content: "Tengo problemas de conexión en este momento. Por favor escríbenos directamente por WhatsApp o Instagram." }])
      }
    );
  };

  const quickReplies = ["¿Qué app me recomiendas?", "¿Cuánto puedo ganar?", "¿Cómo me uno?", "Métodos de pago"];

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      style={{ x, y }}
      className="fixed bottom-6 right-5 z-50 flex flex-col items-end"
    >
      {/* Welcome bubble (auto-open, closes after 5s) */}
      <AnimatePresence>
        {showWelcome && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.92 }}
            transition={{ duration: 0.22 }}
            className="mb-3 max-w-[260px] bg-[#0a0a16] border border-blue-500/25 rounded-2xl rounded-br-sm px-4 py-3 shadow-xl shadow-blue-950/40 text-[13px] text-white/85 leading-relaxed cursor-pointer"
            onClick={handleOpen}
          >
            {WELCOME_MESSAGE}
            <div className="mt-2 text-[11px] text-blue-400 font-semibold">Toca para chatear →</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.94 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-[340px] sm:w-[370px] h-[520px] bg-[#0a0a16] border border-blue-500/20 rounded-2xl shadow-2xl shadow-blue-950/40 overflow-hidden flex flex-col mb-4"
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between cursor-grab active:cursor-grabbing select-none">
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
              <button onClick={handleClose} className="text-white/70 hover:text-white p-1 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === "user" ? "bg-blue-600/30" : "bg-blue-500/20 border border-blue-500/30"
                  }`}>
                    {msg.role === "user"
                      ? <User className="w-3.5 h-3.5 text-blue-300" />
                      : <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-[#111125] border border-blue-500/15 text-white/80 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="bg-[#111125] border border-blue-500/15 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {quickReplies.map((q) => (
                  <button key={q} onClick={() => { setInput(q); setHasInteracted(true); }}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 hover:bg-blue-500/25 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-blue-500/10 bg-[#080812]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 bg-[#111125] border border-blue-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/40 transition-colors"
                  disabled={chatMutation.isPending}
                />
                <button type="submit" disabled={!input.trim() || chatMutation.isPending}
                  className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-500 transition-all shrink-0">
                  {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => isOpen ? handleClose() : handleOpen()}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.45)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)] transition-all text-sm"
      >
        {isOpen ? <X className="w-5 h-5" /> : (
          <>
            <MessageCircle className="w-5 h-5" />
            <span>Habla con Ángela</span>
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
