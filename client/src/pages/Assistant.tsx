import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Send, Bot, Sparkles, Trash2, ChevronDown,
  BookOpen, CreditCard, RefreshCw, User, HelpCircle,
  Briefcase, DollarSign, Star, Wifi, Shield, Clock, Plus, X
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { getChatbotResponse, ChatMessage, ChatContext } from "@/data/chatbotKnowledge";

// ─── Persistence ───────────────────────────────────────────────────────────────
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

// ─── Quick Actions ─────────────────────────────────────────────────────────────
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

const CUSTOMER_SUGGESTION_CARDS = [
  { icon: BookOpen, label: "My Bookings", query: "View my bookings", bg: "bg-blue-50", iconColor: "text-blue-500", border: "border-blue-100" },
  { icon: CreditCard, label: "Payments", query: "Payment methods", bg: "bg-emerald-50", iconColor: "text-emerald-500", border: "border-emerald-100" },
  { icon: RefreshCw, label: "Refunds", query: "Refund policy", bg: "bg-amber-50", iconColor: "text-amber-500", border: "border-amber-100" },
  { icon: HelpCircle, label: "Get Help", query: "Contact support", bg: "bg-slate-50", iconColor: "text-slate-500", border: "border-slate-200" },
];

const PROVIDER_SUGGESTION_CARDS = [
  { icon: Briefcase, label: "Job Requests", query: "Why am I not getting jobs?", bg: "bg-blue-50", iconColor: "text-blue-500", border: "border-blue-100" },
  { icon: DollarSign, label: "Earnings", query: "Earnings breakdown", bg: "bg-emerald-50", iconColor: "text-emerald-500", border: "border-emerald-100" },
  { icon: Star, label: "My Ratings", query: "How to improve ratings", bg: "bg-amber-50", iconColor: "text-amber-500", border: "border-amber-100" },
  { icon: Shield, label: "Membership", query: "Membership benefits", bg: "bg-purple-50", iconColor: "text-purple-500", border: "border-purple-100" },
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

// ─── Component ─────────────────────────────────────────────────────────────────
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
  const [composerFocused, setComposerFocused] = useState(false);

  // Swipe state
  const [swipeDelta, setSwipeDelta] = useState(0);
  const swipeStartY = useRef<number | null>(null);
  const swipeActive = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleBack = useCallback(() => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(fromPathname, { replace: true });
  }, [navigate, fromPathname]);

  // Swipe handlers
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY;
    swipeActive.current = false;
    setSwipeDelta(0);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (swipeStartY.current === null) return;
    const delta = e.touches[0].clientY - swipeStartY.current;
    if (delta > 10) {
      swipeActive.current = true;
      setSwipeDelta(Math.min(delta, 180));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (swipeActive.current && swipeDelta > 80) handleBack();
    else { setSwipeDelta(0); swipeActive.current = false; }
    swipeStartY.current = null;
  }, [swipeDelta, handleBack]);

  // Context
  const buildContext = useCallback((): ChatContext => {
    const activeCount = (bookings || []).filter((b: any) =>
      ["pending", "accepted", "assigned", "on_the_way", "arrived", "in_progress"].includes(b.status)
    ).length;
    return { pathname: fromPathname, userRole, userName, walletBalance: walletBalance || 0, activeBookingsCount: activeCount };
  }, [fromPathname, userRole, userName, walletBalance, bookings]);

  // Init
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

  // Send
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
  const suggestionCards = userRole === "provider" ? PROVIDER_SUGGESTION_CARDS : CUSTOMER_SUGGESTION_CARDS;
  const contextSuggestions = getContextSuggestions(fromPathname, userRole);
  const swipeProgress = Math.min(swipeDelta / 80, 1);
  const showReleaseHint = swipeDelta > 80;
  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes composerFloat {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-1px); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.15); }
          50%      { box-shadow: 0 0 0 6px rgba(var(--primary-rgb), 0); }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform: translateY(0); opacity: 0.4; }
          40%          { transform: translateY(-5px); opacity: 1; }
        }

        .msg-enter { animation: msgIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
        .fade-up   { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }

        .composer-wrap {
          animation: composerFloat 4s ease-in-out infinite;
        }
        .composer-wrap.focused {
          animation: none;
        }

        .dot-1 { animation: dotBounce 1.2s ease-in-out infinite 0ms; }
        .dot-2 { animation: dotBounce 1.2s ease-in-out infinite 160ms; }
        .dot-3 { animation: dotBounce 1.2s ease-in-out infinite 320ms; }

        .card-tap { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .card-tap:active { transform: scale(0.96); }

        .sheet-overlay { animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div
        className="min-h-full flex flex-col absolute inset-0 z-50 overflow-hidden"
        style={{
          background: "#F2F4F7",
          transform: swipeDelta > 0 ? `translateY(${swipeDelta * 0.6}px) scale(${1 - swipeProgress * 0.03})` : "none",
          transition: swipeActive.current ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
          borderRadius: swipeDelta > 20 ? `${Math.min(swipeDelta / 4, 28)}px` : 0,
          boxShadow: swipeDelta > 10 ? `0 ${swipeDelta}px 80px rgba(0,0,0,0.2)` : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Swipe indicator */}
        <div
          className="absolute top-0 left-0 right-0 flex flex-col items-center pt-2 z-50 pointer-events-none transition-opacity duration-200"
          style={{ opacity: swipeDelta > 15 ? 1 : 0 }}
        >
          <div className="w-10 h-1 bg-white/50 rounded-full mb-1" />
          {swipeDelta > 40 && (
            <div className={`text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-sm transition-all ${showReleaseHint ? "bg-emerald-500/90 text-white" : "bg-black/25 text-white/90"}`}>
              {showReleaseHint ? "↑ Release to go back" : "Keep pulling..."}
            </div>
          )}
        </div>

        {/* ── Compact Header ─────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 sticky top-0 z-20"
          style={{
            background: "linear-gradient(135deg, #0F2744 0%, #1a3a5c 100%)",
            paddingTop: "env(safe-area-inset-top, 12px)",
          }}
        >
          {/* Subtle noise texture overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

          <div className="flex items-center px-4 py-3 gap-3 relative z-10">
            {/* Back button */}
            <button
              onClick={handleBack}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <ArrowLeft size={17} className="text-white" />
            </button>

            {/* Avatar */}
            <div className="relative">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)" }}
              >
                <Bot size={16} className="text-white" />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0F2744]"
                style={{ background: "#34D399" }}
              />
            </div>

            {/* Name + status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-semibold text-[14px] leading-tight">
                  {userRole === "provider" ? "Provider Support" : "RoundU Assistant"}
                </span>
                <Sparkles size={10} className="text-amber-400 flex-shrink-0" />
              </div>
              <p className="text-white/50 text-[11px] font-medium">AI-powered · Always available</p>
            </div>

            {/* Clear button */}
            {messages.length > 1 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <Trash2 size={11} className="text-white/60" />
                <span className="text-[11px] text-white/60 font-medium">Clear</span>
              </button>
            )}
          </div>

          {/* Context chips */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            {contextSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSend(s)}
                className="flex-shrink-0 text-[11px] font-semibold text-white/80 px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* ── Messages area ──────────────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto no-scrollbar"
          style={{ paddingBottom: "100px" }}
        >
          {/* Empty state */}
          {isEmpty && !isTyping && (
            <div className="px-5 pt-8 pb-4 fade-up">
              <div className="text-center mb-6">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #0F2744, #1a3a5c)",
                    boxShadow: "0 8px 24px rgba(15,39,68,0.25)",
                  }}
                >
                  <Sparkles size={24} className="text-amber-400" />
                </div>
                <h2 className="text-[20px] font-bold text-slate-800 tracking-tight mb-1">
                  {userRole === "provider" ? "How can I help you grow?" : "What can I help with?"}
                </h2>
                <p className="text-[13px] text-slate-400 font-medium">
                  Ask me anything or pick a topic below
                </p>
              </div>

              {/* Premium suggestion cards */}
              <div className="grid grid-cols-2 gap-3">
                {suggestionCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(card.query)}
                      className={`card-tap text-left p-4 rounded-2xl border ${card.bg} ${card.border} flex flex-col gap-2.5`}
                      style={{
                        animationDelay: `${i * 60}ms`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-white/70 ${card.iconColor}`}
                        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
                        <Icon size={17} />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700 leading-tight">{card.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="px-4 pt-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                className={`msg-enter flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div className={`flex items-end gap-2 max-w-[82%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <div
                    className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold`}
                    style={msg.sender === "user"
                      ? { background: "#E2E8F0", color: "#64748B" }
                      : { background: "linear-gradient(135deg, #0F2744, #1a3a5c)", color: "white" }
                    }
                  >
                    {msg.sender === "user" ? userName.charAt(0).toUpperCase() : <Bot size={11} />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`px-4 py-3 text-[14px] leading-relaxed`}
                    style={msg.sender === "user" ? {
                      background: "linear-gradient(135deg, #0F2744 0%, #1a3a5c 100%)",
                      color: "white",
                      borderRadius: "20px 20px 4px 20px",
                      boxShadow: "0 2px 12px rgba(15,39,68,0.2)",
                    } : {
                      background: "white",
                      color: "#334155",
                      borderRadius: "20px 20px 20px 4px",
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
                    }}
                  >
                    {msg.text.split("\n").map((line, i, arr) => (
                      <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                    ))}
                  </div>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-slate-400 mt-1 px-8 font-medium">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>

                {/* Options */}
                {msg.sender === "bot" && msg.options && msg.options.length > 0 && idx === messages.length - 1 && (
                  <div className="mt-2 flex flex-wrap gap-2 px-8">
                    {msg.options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(opt)}
                        className="card-tap text-[12px] font-semibold px-3.5 py-2 rounded-full transition-all"
                        style={{
                          color: "#0F2744",
                          background: "rgba(15,39,68,0.06)",
                          border: "1.5px solid rgba(15,39,68,0.12)",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="msg-enter flex items-end gap-2">
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #0F2744, #1a3a5c)" }}
                >
                  <Bot size={11} className="text-white" />
                </div>
                <div
                  className="px-4 py-3.5 flex items-center gap-1.5"
                  style={{
                    background: "white",
                    borderRadius: "20px 20px 20px 4px",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 1px 8px rgba(0,0,0,0.07)",
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-slate-300 dot-1" />
                  <span className="w-2 h-2 rounded-full bg-slate-300 dot-2" />
                  <span className="w-2 h-2 rounded-full bg-slate-300 dot-3" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Floating Composer ──────────────────────────────────────────────── */}
        <div
          className={`absolute bottom-0 left-0 right-0 pointer-events-none z-30`}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
        >
          <div className="px-4 pb-4 pt-2 pointer-events-auto">
            <div
              className={`composer-wrap ${composerFocused ? "focused" : ""}`}
            >
              <div
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{
                  background: composerFocused ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: "24px",
                  boxShadow: composerFocused
                    ? "0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)"
                    : "0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
                  border: composerFocused
                    ? "1.5px solid rgba(15,39,68,0.15)"
                    : "1.5px solid rgba(255,255,255,0.9)",
                  transition: "box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease",
                }}
              >
                {/* Quick actions button */}
                <button
                  onClick={() => setShowQuickActions(v => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  style={{
                    background: showQuickActions
                      ? "linear-gradient(135deg, #0F2744, #1a3a5c)"
                      : "rgba(15,39,68,0.07)",
                    color: showQuickActions ? "white" : "#0F2744",
                    transition: "background 0.2s ease, color 0.2s ease",
                  }}
                >
                  {showQuickActions ? <X size={15} /> : <Plus size={15} />}
                </button>

                {/* Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => setComposerFocused(false)}
                  placeholder="Ask anything…"
                  className="flex-1 bg-transparent text-[14px] font-medium text-slate-700 placeholder-slate-400 focus:outline-none min-w-0"
                  style={{ caretColor: "#0F2744" }}
                />

                {/* Send button */}
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  style={{
                    background: input.trim() && !isTyping
                      ? "linear-gradient(135deg, #0F2744 0%, #1a3a5c 100%)"
                      : "rgba(15,39,68,0.08)",
                    boxShadow: input.trim() && !isTyping
                      ? "0 4px 12px rgba(15,39,68,0.3)"
                      : "none",
                    transition: "background 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  <Send
                    size={14}
                    className="ml-0.5"
                    style={{ color: input.trim() && !isTyping ? "white" : "#94A3B8" }}
                  />
                </button>
              </div>

              {/* Session indicator */}
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <Clock size={9} className="text-slate-400" />
                <span className="text-[10px] text-slate-400 font-medium">
                  {hadPreviousChat ? "Restored session" : "New session"} · History saved
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions Sheet ────────────────────────────────────────────── */}
        {showQuickActions && (
          <div
            className="fixed inset-0 z-40 flex flex-col justify-end"
            style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowQuickActions(false)}
          >
            <div
              className="sheet-overlay bg-white p-5 max-h-[70vh] overflow-y-auto no-scrollbar"
              style={{
                borderRadius: "28px 28px 0 0",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

              <h3 className="text-[16px] font-bold text-slate-800 mb-4">
                {userRole === "provider" ? "Provider Help Topics" : "How can I help you?"}
              </h3>

              {/* Category tabs */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
                {quickActions.map((cat, i) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveCategory(i)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-95"
                      style={activeCategory === i ? {
                        background: "linear-gradient(135deg, #0F2744, #1a3a5c)",
                        color: "white",
                        boxShadow: "0 4px 12px rgba(15,39,68,0.25)",
                      } : {
                        background: "#F1F5F9",
                        color: "#64748B",
                        border: "1.5px solid transparent",
                      }}
                    >
                      <Icon size={12} />
                      {cat.category}
                    </button>
                  );
                })}
              </div>

              {/* Action items */}
              <div className="flex flex-col gap-2">
                {quickActions[activeCategory].actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => { handleSend(action); setShowQuickActions(false); }}
                    className="card-tap text-left px-4 py-3.5 rounded-2xl text-[13px] font-semibold text-slate-700 transition-all"
                    style={{
                      background: "#F8FAFC",
                      border: "1.5px solid #E2E8F0",
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Assistant;