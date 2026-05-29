import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Send, Bot, Sparkles, Trash2, ChevronDown,
  BookOpen, CreditCard, RefreshCw, User, HelpCircle,
  Briefcase, DollarSign, Star, Wifi, Shield, Clock
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { getChatbotResponse, ChatMessage, ChatContext } from "@/data/chatbotKnowledge";

// ─── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_KEY = "roundu_chat_history";
const STORAGE_TTL = 10 * 60 * 1000;

interface PersistedChat {
  messages: ChatMessage[];
  savedAt: number;
  userRole: string;
  userId: string;
}

const loadPersistedChat = (userId: string, role: string): ChatMessage[] | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: PersistedChat = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > STORAGE_TTL || parsed.userId !== userId || parsed.userRole !== role) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.messages;
  } catch { return null; }
};

const persistChat = (messages: ChatMessage[], userId: string, role: string) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, savedAt: Date.now(), userRole: role, userId }));
  } catch { }
};

const clearPersistedChat = () => { try { sessionStorage.removeItem(STORAGE_KEY); } catch { } };

// ─── Quick Actions ────────────────────────────────────────────────────────────
const CUSTOMER_QUICK_ACTIONS = [
  { category: "Bookings", icon: BookOpen, color: "bg-blue-50 text-blue-600 border-blue-100", actions: ["How do I book a service?", "View my bookings", "Cancel a booking", "Reschedule booking", "Booking status"] },
  { category: "Payments", icon: CreditCard, color: "bg-emerald-50 text-emerald-600 border-emerald-100", actions: ["Payment failed", "Payment methods", "Download invoice", "Wallet help", "Add money to wallet"] },
  { category: "Refunds", icon: RefreshCw, color: "bg-amber-50 text-amber-600 border-amber-100", actions: ["Refund policy", "Refund status", "How long does refund take?"] },
  { category: "Account", icon: User, color: "bg-purple-50 text-purple-600 border-purple-100", actions: ["Update profile", "Change phone number", "Manage notifications", "Saved addresses"] },
  { category: "General", icon: HelpCircle, color: "bg-slate-50 text-slate-600 border-slate-100", actions: ["Contact support", "Service availability", "Membership benefits", "Report an issue"] },
];

const PROVIDER_QUICK_ACTIONS = [
  { category: "Jobs", icon: Briefcase, color: "bg-blue-50 text-blue-600 border-blue-100", actions: ["Why am I not getting jobs?", "How do job assignments work?", "Job status guide", "How to complete a job"] },
  { category: "Profile", icon: User, color: "bg-purple-50 text-purple-600 border-purple-100", actions: ["Complete my profile", "Verification help", "Update my services", "Service area settings"] },
  { category: "Online Status", icon: Wifi, color: "bg-green-50 text-green-600 border-green-100", actions: ["Go online help", "Visibility issues", "Why am I not discoverable?"] },
  { category: "Earnings", icon: DollarSign, color: "bg-emerald-50 text-emerald-600 border-emerald-100", actions: ["Earnings breakdown", "Payout schedule", "Withdrawal help", "Transaction history"] },
  { category: "Membership", icon: Shield, color: "bg-amber-50 text-amber-600 border-amber-100", actions: ["Membership benefits", "Upgrade membership", "Visibility boost"] },
  { category: "Ratings", icon: Star, color: "bg-rose-50 text-rose-600 border-rose-100", actions: ["How to improve ratings", "Customer reviews", "Ranking factors"] },
];

const getContextSuggestions = (pathname: string, role: string): string[] => {
  const path = pathname.split("/")[1] || "home";
  if (role === "provider") {
    if (path === "provider") return ["Why am I not getting jobs?", "Earnings help", "Membership benefits"];
    if (path === "earnings") return ["Payout schedule", "Withdrawal help", "Earnings breakdown"];
    if (path === "subscriptions") return ["Upgrade benefits", "Visibility boost", "Membership comparison"];
    return ["How do job assignments work?", "Go online help", "Complete my profile"];
  }
  if (path === "wallet") return ["Transaction history", "Add money", "Refund status"];
  if (path === "bookings") return ["Cancel a booking", "Booking status", "Reschedule booking"];
  return ["How do I book a service?", "Refund policy", "My bookings"];
};

// ─── Component ────────────────────────────────────────────────────────────────
const Assistant = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, bookings, walletBalance } = useApp() as any;

  const fromPathname = location.state?.from || "/home";
  const userId = user?.id || "guest";
  const userRole = role || "customer";
  const userName = user?.name?.split(" ")[0] || "there";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [hadPreviousChat, setHadPreviousChat] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ── Swipe state ─────────────────────────────────────────────────────────────
  const [swipeDelta, setSwipeDelta] = useState(0);
  const swipeStartY = useRef<number | null>(null);
  const swipeActive = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── handleBack must be defined BEFORE swipe handlers ───────────────────────
  const handleBack = useCallback(() => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fromPathname, { replace: true });
  }, [navigate, fromPathname]);

  // ── Swipe handlers ──────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY;
    swipeActive.current = false;
    setSwipeDelta(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (swipeStartY.current === null) return;
    const delta = e.touches[0].clientY - swipeStartY.current;
    // Activate downward swipe regardless of scroll position
    // (user must swipe down with intent — at least 10px before we start tracking)
    if (delta > 10) {
      swipeActive.current = true;
      setSwipeDelta(Math.min(delta, 180));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (swipeActive.current && swipeDelta > 80) {
      // Threshold met — go back
      handleBack();
    } else {
      // Snap back
      setSwipeDelta(0);
      swipeActive.current = false;
    }
    swipeStartY.current = null;
  }, [swipeDelta, handleBack]);

  // ── Context ─────────────────────────────────────────────────────────────────
  const buildContext = useCallback((): ChatContext => {
    const activeCount = (bookings || []).filter((b: any) =>
      ["pending", "accepted", "assigned", "on_the_way", "arrived", "in_progress"].includes(b.status)
    ).length;
    return { pathname: fromPathname, userRole, userName, walletBalance: walletBalance || 0, activeBookingsCount: activeCount };
  }, [fromPathname, userRole, userName, walletBalance, bookings]);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    const saved = loadPersistedChat(userId, userRole);
    if (saved && saved.length > 0) {
      setHadPreviousChat(true);
      setMessages(saved);
      setTimeout(() => {
        const lastUserMsg = [...saved].reverse().find(m => m.sender === "user");
        const preview = lastUserMsg ? `"${lastUserMsg.text.slice(0, 40)}${lastUserMsg.text.length > 40 ? "..." : ""}"` : "your previous topic";
        setMessages(prev => [...prev, {
          id: `wb-${Date.now()}`,
          sender: "bot",
          text: `Welcome back ${userName} 👋\nYou were previously discussing ${preview}. Would you like to continue?`,
          timestamp: Date.now(),
          options: ["Yes, continue", "Start fresh"],
        }]);
      }, 400);
    } else {
      setIsTyping(true);
      setTimeout(() => {
        const ctx = buildContext();
        const response = getChatbotResponse("hi", ctx);
        setMessages([{ id: `greet-${Date.now()}`, sender: "bot", text: response.text, timestamp: Date.now(), options: response.options }]);
        setIsTyping(false);
      }, 500);
    }
  }, [initialized, userId, userRole, userName, buildContext]);

  useEffect(() => { if (messages.length > 0) persistChat(messages, userId, userRole); }, [messages, userId, userRole]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === "roundu_token" && !e.newValue) clearPersistedChat(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Send ────────────────────────────────────────────────────────────────────
  const handleSend = useCallback((text: string = input) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;
    if (trimmed === "Start fresh") {
      clearPersistedChat(); setMessages([]); setHadPreviousChat(false); setInitialized(false); return;
    }
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, sender: "user", text: trimmed, timestamp: Date.now() }]);
    setInput("");
    setIsTyping(true);
    setShowQuickActions(false);
    setTimeout(() => {
      const response = getChatbotResponse(trimmed, buildContext());
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, sender: "bot", text: response.text, timestamp: Date.now(), options: response.options }]);
      setIsTyping(false);
    }, 700 + Math.random() * 400);
  }, [input, isTyping, buildContext]);

  const handleClearChat = () => { clearPersistedChat(); setMessages([]); setHadPreviousChat(false); setInitialized(false); };

  const quickActions = userRole === "provider" ? PROVIDER_QUICK_ACTIONS : CUSTOMER_QUICK_ACTIONS;
  const contextSuggestions = getContextSuggestions(fromPathname, userRole);

  // Derived swipe visuals
  const swipeProgress = Math.min(swipeDelta / 80, 1); // 0→1
  const showReleaseHint = swipeDelta > 80;

  return (
    <div
      className="min-h-full flex flex-col bg-[#F8FAFC] absolute inset-0 z-50 overflow-hidden"
      style={{
        transform: swipeDelta > 0 ? `translateY(${swipeDelta * 0.6}px) scale(${1 - swipeProgress * 0.03})` : "none",
        transition: swipeActive.current ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
        borderRadius: swipeDelta > 20 ? `${Math.min(swipeDelta / 4, 28)}px` : 0,
        boxShadow: swipeDelta > 10 ? `0 ${swipeDelta}px 80px rgba(0,0,0,0.2)` : "none",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Swipe indicator ── */}
      <div
        className="absolute top-0 left-0 right-0 flex flex-col items-center pt-2 z-50 pointer-events-none transition-opacity duration-200"
        style={{ opacity: swipeDelta > 15 ? 1 : 0 }}
      >
        <div className="w-10 h-1 bg-white/50 rounded-full mb-1" />
        {swipeDelta > 40 && (
          <div className={`text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-sm transition-all ${showReleaseHint
              ? "bg-emerald-500/90 text-white"
              : "bg-black/25 text-white/90"
            }`}>
            {showReleaseHint ? "↑ Release to go back" : "Keep pulling..."}
          </div>
        )}
      </div>

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-primary to-[#1C3D63] px-5 pt-10 pb-4 sticky top-0 z-20 shadow-lg flex-shrink-0">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all">
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-[15px] flex items-center gap-1.5">
                {userRole === "provider" ? "Provider Support" : "RoundU Assistant"}
                <Sparkles size={12} className="text-amber-400" />
              </h3>
              <p className="text-white/70 text-[11px] font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online · AI powered
              </p>
            </div>
          </div>
          {messages.length > 1 && (
            <button onClick={handleClearChat} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all">
              <Trash2 size={12} className="text-white/80" />
              <span className="text-[11px] text-white/80 font-semibold">Clear</span>
            </button>
          )}
        </div>
        {/* Context suggestions */}
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {contextSuggestions.map((s, i) => (
            <button key={i} onClick={() => handleSend(s)}
              className="flex-shrink-0 text-[11px] font-bold text-white/90 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 pb-32 space-y-4">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div className={`flex items-end gap-2 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${msg.sender === "user" ? "bg-slate-200 text-slate-500" : "bg-primary text-white"}`}>
                {msg.sender === "user" ? userName.charAt(0).toUpperCase() : <Bot size={13} />}
              </div>
              <div className={`px-4 py-3 text-[14px] leading-relaxed shadow-sm ${msg.sender === "user" ? "bg-primary text-white rounded-[20px] rounded-br-sm" : "bg-white text-slate-700 rounded-[20px] rounded-bl-sm border border-slate-100"}`}>
                {msg.text.split("\n").map((line, i, arr) => <span key={i}>{line}{i < arr.length - 1 && <br />}</span>)}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-9 font-medium">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {msg.sender === "bot" && msg.options && msg.options.length > 0 && idx === messages.length - 1 && (
              <div className="mt-2 flex flex-wrap gap-2 px-9">
                {msg.options.map((opt, i) => (
                  <button key={i} onClick={() => handleSend(opt)}
                    className="text-[12px] font-bold text-primary bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-all active:scale-95">
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Bot size={13} className="text-white" />
            </div>
            <div className="bg-white border border-slate-100 px-4 py-3.5 rounded-[20px] rounded-bl-sm shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Actions Drawer ── */}
      {showQuickActions && (
        <div className="fixed inset-0 z-30 flex flex-col justify-end" onClick={() => setShowQuickActions(false)}>
          <div className="bg-white rounded-t-[28px] shadow-2xl p-5 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="text-[15px] font-extrabold text-foreground mb-4">
              {userRole === "provider" ? "Provider Help Topics" : "How can I help you?"}
            </h3>
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
              {quickActions.map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <button key={i} onClick={() => setActiveCategory(i)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] font-bold transition-all ${activeCategory === i ? "bg-primary text-white border-primary" : "bg-slate-50 text-slate-600 border-slate-100"}`}>
                    <Icon size={12} />{cat.category}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              {quickActions[activeCategory].actions.map((action, i) => (
                <button key={i} onClick={() => { handleSend(action); setShowQuickActions(false); }}
                  className="text-left px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all active:scale-[0.98]">
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Input Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-3 pb-8 max-w-[430px] mx-auto z-20">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowQuickActions(v => !v)}
            className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${showQuickActions ? "bg-primary border-primary text-white" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
            <ChevronDown size={16} className={`transition-transform ${showQuickActions ? "rotate-180" : ""}`} />
          </button>
          <div className="flex-1 relative">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask me anything..."
              className="w-full pl-4 pr-12 py-3 bg-[#F8FAFC] border border-slate-200 rounded-2xl text-[14px] font-medium text-slate-700 focus:outline-none focus:border-primary/40 focus:bg-white transition-all" />
            <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40 disabled:bg-slate-300 transition-all active:scale-90">
              <Send size={15} className="ml-0.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Clock size={9} className="text-slate-300" />
          <span className="text-[10px] text-slate-300 font-medium">
            Chat history saved · {hadPreviousChat ? "Restored session" : "New session"}
          </span>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default Assistant;