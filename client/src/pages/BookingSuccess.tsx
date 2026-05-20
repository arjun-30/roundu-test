import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Calendar, Clock, MapPin } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProviderById, getServiceById } from "@/data/mockData";

const BookingSuccess = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { bookings } = useApp();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    navigate("/home", { replace: true });
    return null;
  }
  const provider = getProviderById(booking.providerId);
  const service = getServiceById(booking.serviceId);

  return (
    <div className="min-h-full flex flex-col bg-background px-5 py-8">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="relative mb-6 animate-fade-in-up" style={{ opacity: 0 }}>
          <div className="absolute inset-0 w-24 h-24 rounded-full bg-success/20 animate-pulse-ring" />
          <div className="relative w-24 h-24 rounded-full bg-success flex items-center justify-center">
            <CheckCircle2 size={44} className="text-success-foreground" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-foreground mb-2">Booking Confirmed!</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your booking with {provider?.name} has been scheduled successfully.
        </p>

        <div className="w-full bg-card border border-border rounded-2xl p-4 shadow-card mt-6 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">Booking ID</span>
            <span className="text-xs font-bold text-foreground">{booking.id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="h-px bg-border my-2" />
          <Row icon={Calendar} text={booking.date} />
          <Row icon={Clock} text={booking.time} />
          <Row icon={MapPin} text={`${service?.label} · ₹${booking.price}`} />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2.5">
          <button
            onClick={() => navigate(`/chat/${booking.id}`)}
            className="flex-1 py-4 rounded-2xl bg-input border border-border text-foreground font-bold text-sm active:scale-[0.98] transition-all"
          >
            Chat
          </button>
          <button
            onClick={() => navigate(`/tracking/${booking.id}`, { replace: true })}
            className="flex-[2] py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98] transition-all"
          >
            Track Service
          </button>
        </div>
        <button
          onClick={() => navigate("/home", { replace: true })}
          className="w-full py-4 rounded-2xl bg-input border border-border text-foreground font-bold text-sm active:scale-[0.98] transition-all"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

const Row = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex items-center gap-2 py-1.5">
    <Icon size={14} className="text-primary" />
    <span className="text-xs text-foreground">{text}</span>
  </div>
);

export default BookingSuccess;
