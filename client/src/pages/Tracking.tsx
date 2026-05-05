import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, MessageCircle, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProviderById, Booking } from "@/data/mockData";

const stages: Booking["status"][] = ["assigned", "on_the_way", "arrived", "in_progress", "completed"];
const stageLabels: Record<string, { title: string; subtitle: string }> = {
  assigned: { title: "Provider Assigned", subtitle: "Your provider has been confirmed" },
  on_the_way: { title: "On the Way", subtitle: "Your provider is heading to you" },
  arrived: { title: "Arrived", subtitle: "Your provider has reached your location" },
  in_progress: { title: "Service in Progress", subtitle: "Work is being done" },
  completed: { title: "Completed", subtitle: "Service has been completed" },
};

const Tracking = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { bookings, dispatch } = useApp();
  const booking = bookings.find((b) => b.id === id);
  const [eta, setEta] = useState(15);

  // Simulated live tracking status updates have been removed.
  // The status is now driven solely by the provider's actions via AppContext.
  useEffect(() => {
    const t = setInterval(() => setEta((e) => Math.max(0, e - 1)), 2000);
    return () => clearInterval(t);
  }, []);

  if (!booking) {
    navigate("/home", { replace: true });
    return null;
  }
  const provider = getProviderById(booking.providerId);
  const currentIdx = stages.indexOf(booking.status);

  return (
    <div className="min-h-full flex flex-col bg-background pb-32">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/home")} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Live Tracking</h1>
      </div>

      <div className="px-5 flex-1 space-y-5 overflow-y-auto">
        {/* Map placeholder */}
        <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <div className="relative text-center">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mx-auto mb-2 animate-pulse-dot shadow-card">
              <MapPin size={20} className="text-primary-foreground" />
            </div>
            <p className="text-xs font-bold text-foreground">ETA: {eta} min</p>
          </div>
        </div>

        {/* Provider card */}
        {provider && (
          <div className="bg-card border border-border rounded-2xl p-4 shadow-card flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {provider.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{provider.name}</p>
              <p className="text-[10px] text-muted-foreground">{provider.rating} ★ · {provider.experienceYrs} yrs experience</p>
            </div>
            <button className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center">
              <Phone size={16} className="text-primary" />
            </button>
            <button className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center">
              <MessageCircle size={16} className="text-primary" />
            </button>
          </div>
        )}

        {/* Status timeline */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-4">Status</h3>
          <div className="space-y-3">
            {stages.map((s, i) => {
              const done = i <= currentIdx;
              const current = i === currentIdx && booking.status !== "completed";
              return (
                <div key={s} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    done ? "bg-primary" : "bg-input border border-border"
                  } ${current ? "ring-4 ring-primary/20" : ""}`}>
                    {done && <Check size={14} className="text-primary-foreground" />}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className={`text-xs font-bold ${done ? "text-foreground" : "text-muted-foreground"}`}>{stageLabels[s].title}</p>
                    <p className="text-[10px] text-muted-foreground">{stageLabels[s].subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {booking.status === "completed" && (
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-card border-t border-border">
          <button
            onClick={() => {
              if (!booking.paid) {
                // If not paid, go to payment first
                dispatch({ type: "SELECT_PROVIDER", id: booking.providerId });
                dispatch({ type: "SELECT_SERVICE", id: booking.serviceId });
                navigate("/booking/payment");
              } else {
                navigate(`/rating/${booking.id}`);
              }
            }}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98]"
          >
            {!booking.paid ? "Complete & Pay" : "Rate Your Experience"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Tracking;
