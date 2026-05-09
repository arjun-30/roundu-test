import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, MessageCircle, Check, IndianRupee, CheckCircle2, XCircle } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { socket } from "@/lib/socket";
import { getProviderById } from "@/data/mockData";

const stages = ["assigned", "on_the_way", "arrived", "in_progress", "completed"] as const;
const stageLabels: Record<string, { title: string; subtitle: string; color: string }> = {
  assigned:    { title: "Provider Assigned",     subtitle: "Your provider has been confirmed",     color: "bg-blue-500" },
  on_the_way:  { title: "On the Way",            subtitle: "Your provider is heading to you",      color: "bg-indigo-500" },
  arrived:     { title: "Arrived",               subtitle: "Your provider has reached you",         color: "bg-orange-500" },
  in_progress: { title: "Service in Progress",   subtitle: "Work is being done",                   color: "bg-primary" },
  completed:   { title: "Completed",             subtitle: "Service has been completed ✅",         color: "bg-green-500" },
};

const Tracking = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { bookings, dispatch } = useApp();
  const booking = bookings.find((b) => b.id === id);
  const [eta, setEta] = useState(15);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [pendingQuote, setPendingQuote] = useState<{ amount: number } | null>(null);
  const [notification, setNotification] = useState("");

  // ETA countdown
  useEffect(() => {
    const t = setInterval(() => setEta((e) => Math.max(0, e - 1)), 60000);
    return () => clearInterval(t);
  }, []);

  // Listen for real-time status updates from provider
  useEffect(() => {
    const handleStatusUpdate = (data: { bookingId: string; status: string; quote?: number }) => {
      const normalizedId = data.bookingId.replace("req-", "");
      if (normalizedId !== id && data.bookingId !== id) return;

      console.log("[tracking] status update received:", data.status);
      setLiveStatus(data.status);
      dispatch({ type: "UPDATE_BOOKING_STATUS", bookingId: id, status: data.status as any });

      if (data.status === "quote_set" && data.quote) {
        setPendingQuote({ amount: data.quote });
        setNotification(`💰 Provider sent a quote: ₹${data.quote}`);
      } else if (data.status === "on_the_way") {
        setNotification("🚗 Your provider is on the way!");
      } else if (data.status === "arrived") {
        setNotification("📍 Your provider has arrived!");
      } else if (data.status === "in_progress") {
        setNotification("🔧 Service has started!");
      } else if (data.status === "completed") {
        setNotification("✅ Service completed!");
      }
      setTimeout(() => setNotification(""), 3000);
    };

    socket.on("job_status_updated", handleStatusUpdate);
    return () => { socket.off("job_status_updated", handleStatusUpdate); };
  }, [id, dispatch]);

  const handleApproveQuote = () => {
    dispatch({ type: "UPDATE_BOOKING_STATUS", bookingId: id, status: "in_progress" as any });
    socket.emit("update_job_status", { bookingId: id, status: "in_progress" });
    setPendingQuote(null);
    setNotification("Quote approved! Service is starting.");
    setTimeout(() => setNotification(""), 3000);
  };

  const handleRejectQuote = () => {
    setPendingQuote(null);
    setNotification("Quote rejected. Provider will be notified.");
    setTimeout(() => setNotification(""), 3000);
  };

  if (!booking) {
    navigate("/home", { replace: true });
    return null;
  }

  const handleCall = () => {
    toast.info("Connecting via secure masked number...");
    window.open("tel:+911234567890", "_self");
  };

  const currentStatus = liveStatus || booking.status;
  const provider = (booking as any).providerDetails || getProviderById(booking.providerId);
  const currentIdx = stages.indexOf(currentStatus as any);

  return (
    <div className="min-h-full flex flex-col bg-background pb-32">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/home")} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Live Tracking</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-600 font-semibold">Live</span>
        </div>
      </div>

      <div className="px-5 flex-1 space-y-5 overflow-y-auto">
        {notification && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-sm font-semibold shadow-sm animate-fade-in text-center">
            {notification}
          </div>
        )}

        {/* Map / ETA card */}
        <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative text-center">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-2 animate-pulse shadow-card">
              <MapPin size={20} className="text-primary-foreground" />
            </div>
            <p className="text-xs font-bold text-foreground">
              {currentStatus === "assigned" ? `ETA: ${eta} min` :
               currentStatus === "on_the_way" ? "Provider is on the way 🚗" :
               currentStatus === "arrived" ? "Provider has arrived 📍" :
               currentStatus === "in_progress" ? "Service in progress 🔧" :
               currentStatus === "completed" ? "Service complete ✅" : `ETA: ${eta} min`}
            </p>
          </div>
        </div>

        {/* Provider card */}
        {provider && (
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              {typeof provider.avatar === "string" && provider.avatar.startsWith("http")
                ? <img src={provider.avatar} className="w-12 h-12 rounded-xl object-cover" alt={provider.name} />
                : (provider.avatar || provider.name?.[0] || "P")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{provider.name}</p>
              <p className="text-[10px] text-muted-foreground">{provider.rating} ★ · {provider.experienceYrs} yrs experience</p>
            </div>
            <button onClick={handleCall} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center">
              <Phone size={16} className="text-primary" />
            </button>
            <button onClick={() => navigate(`/chat/${provider.id}`)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center">
              <MessageCircle size={16} className="text-primary" />
            </button>
          </div>
        )}

        {/* Pending Quote Approval Card */}
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

        {/* Status timeline */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-4">Status Timeline</h3>
          <div className="space-y-3">
            {stages.map((s, i) => {
              const done = i <= currentIdx;
              const isCurrent = i === currentIdx && s !== "completed";
              const info = stageLabels[s];
              return (
                <div key={s} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    done ? info.color : "bg-input border border-border"
                  } ${isCurrent ? "ring-4 ring-primary/20 scale-110" : ""}`}>
                    {done && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className={`text-xs font-bold transition-colors ${done ? "text-foreground" : "text-muted-foreground"}`}>{info.title}</p>
                    <p className="text-[10px] text-muted-foreground">{info.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {currentStatus === "completed" && (
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-card border-t border-border">
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
    </div>
  );
};

export default Tracking;
