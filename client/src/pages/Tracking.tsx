import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Phone, MessageCircle, CheckCircle2, XCircle,
  IndianRupee, Navigation2, MapPin, Wrench, Flag, MessageSquare
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { socket } from "@/lib/socket";
import { getProviderById } from "@/data/mockData";

// 4 stages matching the provider side
const CUSTOMER_STAGES = [
  {
    key: "on_the_way",
    label: "Started",
    desc: "Provider is heading to you",
    icon: Navigation2,
    color: "bg-indigo-500",
    ring: "ring-indigo-200",
    light: "bg-indigo-50 border-indigo-200",
    textColor: "text-indigo-700",
    emoji: "🚗",
  },
  {
    key: "arrived",
    label: "Arrived",
    desc: "Provider has reached your location",
    icon: MapPin,
    color: "bg-orange-500",
    ring: "ring-orange-200",
    light: "bg-orange-50 border-orange-200",
    textColor: "text-orange-700",
    emoji: "📍",
  },
  {
    key: "in_progress",
    label: "Ongoing",
    desc: "Service is in progress",
    icon: Wrench,
    color: "bg-blue-600",
    ring: "ring-blue-200",
    light: "bg-blue-50 border-blue-200",
    textColor: "text-blue-700",
    emoji: "🔧",
  },
  {
    key: "completed",
    label: "Completed",
    desc: "Service has been completed!",
    icon: Flag,
    color: "bg-green-500",
    ring: "ring-green-200",
    light: "bg-green-50 border-green-200",
    textColor: "text-green-700",
    emoji: "✅",
  },
] as const;

type StageKey = typeof CUSTOMER_STAGES[number]["key"];

// Statuses that precede our 4-stage display
const STATUS_ORDER = ["assigned", "on_the_way", "arrived", "in_progress", "completed"];

const getStageReached = (status: string): number => {
  return STATUS_ORDER.indexOf(status) - 1; // -1 means not started yet (assigned)
};

const Tracking = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { bookings, dispatch } = useApp();
  const booking = bookings.find((b) => b.id === id);

  const [eta, setEta] = useState(15);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [pendingQuote, setPendingQuote] = useState<{ amount: number } | null>(null);
  const [notification, setNotification] = useState({ text: "", emoji: "" });
  const [stageTimes, setStageTimes] = useState<Record<string, string>>({});
  const notifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ETA countdown
  useEffect(() => {
    const t = setInterval(() => setEta((e) => Math.max(0, e - 1)), 60000);
    return () => clearInterval(t);
  }, []);

  const showNotification = (emoji: string, text: string) => {
    setNotification({ text, emoji });
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    notifTimerRef.current = setTimeout(() => setNotification({ text: "", emoji: "" }), 4000);
  };

  // Listen for real-time status updates
  useEffect(() => {
    const handleStatusUpdate = (data: { bookingId: string; status: string; quote?: number }) => {
      const normalizedId = data.bookingId.replace("req-", "");
      if (normalizedId !== id && data.bookingId !== id) return;

      setLiveStatus(data.status);
      dispatch({ type: "UPDATE_BOOKING_STATUS", bookingId: id, status: data.status as any });

      // Record timestamp
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setStageTimes((prev) => ({ ...prev, [data.status]: now }));

      if (data.status === "quote_set" && data.quote) {
        setPendingQuote({ amount: data.quote });
        showNotification("💰", `Provider sent a quote: ₹${data.quote}`);
      } else if (data.status === "on_the_way") {
        showNotification("🚗", "Your provider is on the way!");
      } else if (data.status === "arrived") {
        showNotification("📍", "Your provider has arrived!");
      } else if (data.status === "in_progress") {
        showNotification("🔧", "Service has started!");
      } else if (data.status === "completed") {
        showNotification("✅", "Service completed! Taking you to payment…");
        setTimeout(() => {
          navigate("/booking/payment", { state: { bookingId: id } });
        }, 2000);
      }
    };

    socket.on("job_status_updated", handleStatusUpdate);
    return () => { socket.off("job_status_updated", handleStatusUpdate); };
  }, [id, dispatch, navigate]);

  const handleApproveQuote = () => {
    dispatch({ type: "UPDATE_BOOKING_STATUS", bookingId: id, status: "in_progress" as any });
    socket.emit("update_job_status", { bookingId: id, status: "in_progress" });
    setPendingQuote(null);
    showNotification("✅", "Quote approved! Service is starting.");
  };

  const handleRejectQuote = () => {
    setPendingQuote(null);
    showNotification("❌", "Quote rejected. Provider will be notified.");
  };

  if (!booking) {
    navigate("/home", { replace: true });
    return null;
  }

  const handleCall = () => {
    const phone = provider?.phone || "+919999999992";
    showNotification("📞", "Connecting via secure masked number…");
    window.open(`tel:${phone}`, "_self");
  };

  const currentStatus = liveStatus || booking.status;
  const provider = (booking as any).providerDetails || getProviderById(booking.providerId);

  // Index into our 4 stages (0 = on_the_way, 1 = arrived, etc.)
  const stageReached = getStageReached(currentStatus);

  // Header status text
  const headerText =
    currentStatus === "assigned" ? `Provider assigned · ETA ${eta} min` :
    currentStatus === "on_the_way" ? "Provider is on the way" :
    currentStatus === "arrived" ? "Provider has arrived" :
    currentStatus === "in_progress" ? "Service in progress" :
    currentStatus === "completed" ? "Service complete" :
    `ETA: ${eta} min`;

  return (
    <div className="min-h-full flex flex-col bg-background pb-32 font-['DM_Sans',sans-serif]">

      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button
          onClick={() => navigate("/home")}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Live Tracking</h1>
          <p className="text-[11px] text-muted-foreground">{headerText}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-600 font-semibold">Live</span>
        </div>
      </div>

      <div className="px-5 flex-1 space-y-4">

        {/* ── Notification Toast ─────────────────────────────────────────── */}
        {notification.text && (
          <div className="bg-primary text-primary-foreground p-3 rounded-2xl text-sm font-semibold shadow-lg animate-slide-in flex items-center gap-2">
            <span className="text-base">{notification.emoji}</span>
            {notification.text}
          </div>
        )}

        {/* ── Live Status Hero Card ──────────────────────────────────────── */}
        <div className={`w-full rounded-2xl overflow-hidden border p-5 flex flex-col items-center gap-2 transition-all duration-500 ${
          currentStatus === "completed"
            ? "bg-green-50 border-green-200"
            : currentStatus === "in_progress"
            ? "bg-blue-50 border-blue-200"
            : currentStatus === "arrived"
            ? "bg-orange-50 border-orange-200"
            : currentStatus === "on_the_way"
            ? "bg-indigo-50 border-indigo-200"
            : "bg-gradient-to-br from-primary/10 to-primary/5 border-border"
        }`}>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
            currentStatus === "completed" ? "bg-green-100" :
            currentStatus === "in_progress" ? "bg-blue-100" :
            currentStatus === "arrived" ? "bg-orange-100" :
            currentStatus === "on_the_way" ? "bg-indigo-100" :
            "bg-primary/20"
          }`}>
            <Navigation2 size={24} className={`transition-all duration-500 ${
              currentStatus === "completed" ? "text-green-600" :
              currentStatus === "in_progress" ? "text-blue-600" :
              currentStatus === "arrived" ? "text-orange-600" :
              currentStatus === "on_the_way" ? "text-indigo-600" :
              "text-primary animate-pulse"
            }`} />
          </div>
          <p className={`text-sm font-bold transition-colors ${
            currentStatus === "completed" ? "text-green-800" :
            currentStatus === "in_progress" ? "text-blue-800" :
            currentStatus === "arrived" ? "text-orange-800" :
            currentStatus === "on_the_way" ? "text-indigo-800" :
            "text-foreground"
          }`}>
            {headerText}
          </p>
          <p className="text-[11px] text-muted-foreground">{(booking as any).address || "Your location"}</p>
        </div>

        {/* ── Provider card ─────────────────────────────────────────────── */}
        {provider && (
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {typeof provider.avatar === "string" && provider.avatar.startsWith("http")
                ? <img src={provider.avatar} className="w-12 h-12 rounded-xl object-cover" alt={provider.name} />
                : (provider.avatar || provider.name?.[0] || "P")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{provider.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {provider.rating === 0 ? (
                  <span className="bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider mr-1">New</span>
                ) : (
                  `${provider.rating} ★ · `
                )}
                {provider.experienceYrs} yrs experience
              </p>
            </div>
            <button onClick={handleCall} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center">
              <Phone size={16} className="text-primary" />
            </button>
            <button
              onClick={() => navigate(`/chat/${booking.id}`)}
              className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"
            >
              <MessageCircle size={16} className="text-white" />
            </button>
          </div>
        )}

        {/* ── Pending Quote Approval ─────────────────────────────────────── */}
        {pendingQuote && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 shadow-lg animate-fade-in">
            <p className="text-sm font-bold text-amber-900 mb-1 flex items-center gap-2">
              <IndianRupee size={16} /> Provider Sent a Quote
            </p>
            <p className="text-3xl font-extrabold text-amber-700 mb-4">₹{pendingQuote.amount}</p>
            <div className="flex gap-3">
              <button
                onClick={handleApproveQuote}
                className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <CheckCircle2 size={16} /> Approve
              </button>
              <button
                onClick={handleRejectQuote}
                className="flex-1 py-3 rounded-xl bg-red-100 text-red-600 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 border border-red-200"
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        )}

        {/* ── 4-Stage Animated Timeline ──────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-4">Service Progress</p>

          <div className="space-y-0">
            {CUSTOMER_STAGES.map((stage, idx) => {
              const done = stageReached >= idx;
              const active = stageReached === idx;
              const Icon = stage.icon;
              const isLast = idx === CUSTOMER_STAGES.length - 1;
              const timestamp = stageTimes[stage.key];

              return (
                <div key={stage.key} className="flex gap-4">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    {/* Circle */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-700 ${
                      done
                        ? `${stage.color} shadow-md`
                        : active
                        ? `${stage.color} ring-4 ${stage.ring} scale-110 shadow-lg`
                        : "bg-input border-2 border-border"
                    }`}>
                      <Icon size={16} className={done || active ? "text-white" : "text-muted-foreground"} />
                      {active && (
                        <span className="absolute w-9 h-9 rounded-full animate-ping opacity-20 bg-current" />
                      )}
                    </div>
                    {/* Connector */}
                    {!isLast && (
                      <div className={`w-0.5 h-8 mt-1 mb-1 transition-all duration-700 ${
                        done ? stage.color : "bg-border"
                      }`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-5 ${isLast ? "pb-0" : ""}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-sm font-bold transition-colors ${
                        done || active ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {stage.emoji} {stage.label}
                      </p>
                      {timestamp && (
                        <span className="text-[10px] text-muted-foreground font-medium">{timestamp}</span>
                      )}
                    </div>
                    <p className={`text-[11px] transition-colors ${
                      done || active ? "text-muted-foreground" : "text-muted-foreground/50"
                    }`}>
                      {stage.desc}
                    </p>

                    {/* Active stage badge */}
                    {active && (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${stage.light} ${stage.textColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        In progress
                      </div>
                    )}
                    {done && stage.key === "completed" && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-[10px] font-bold text-green-700">
                        ✅ Done
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Floating Chat Button ───────────────────────────────────────────── */}
      <button
        onClick={() => navigate(`/chat/${booking.id}`)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-primary shadow-xl flex items-center justify-center active:scale-95 transition-transform z-20"
        aria-label="Open chat"
      >
        <MessageSquare size={22} className="text-white" />
      </button>

      {/* ── Complete & Pay CTA ─────────────────────────────────────────────── */}
      {currentStatus === "completed" && (
        <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border">
          <button
            onClick={() => {
              if (!(booking as any).paid) {
                dispatch({ type: "SELECT_PROVIDER", id: booking.providerId });
                dispatch({ type: "SELECT_SERVICE", id: booking.serviceId });
                navigate("/booking/payment");
              } else {
                navigate(`/rating/${booking.id}`);
              }
            }}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98]"
          >
            {!(booking as any).paid ? "Complete & Pay" : "Rate Your Experience"}
          </button>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }

        @keyframes slide-in {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { animation: slide-in 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
      `}</style>
    </div>
  );
};

export default Tracking;
