import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getProviderById, getServiceById } from "@/data/mockData";

const BookingDetail = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { bookings } = useApp();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) {
    navigate("/bookings", { replace: true });
    return null;
  }
  const provider = getProviderById(booking.providerId);
  const service = getServiceById(booking.serviceId);

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Booking Detail</h1>
      </div>

      <div className="flex-1 px-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            {service && (
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <service.icon size={20} className="text-primary-foreground" />
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-foreground">{service?.label}</p>
              <p className="text-[10px] text-muted-foreground">with {provider?.name}</p>
            </div>
            <span className="ml-auto text-base font-extrabold text-primary">₹{booking.price}</span>
          </div>

          <div className="h-px bg-border my-4" />
          <Row icon={Calendar} text={booking.date} />
          <Row icon={Clock} text={booking.time} />
          <Row icon={MapPin} text="Bangalore, KA" />

          {booking.notes && (
            <>
              <div className="h-px bg-border my-3" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Notes</p>
              <p className="text-xs text-foreground">{booking.notes}</p>
            </>
          )}

          {booking.rating && (
            <>
              <div className="h-px bg-border my-3" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Your Review</p>
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: booking.rating }).map((_, i) => (
                  <Star key={i} size={12} className="text-accent fill-accent" />
                ))}
              </div>
              {booking.review && <p className="text-xs text-foreground">{booking.review}</p>}
            </>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Status</p>
          <p className="text-sm font-bold text-foreground capitalize">{booking.status.replace("_", " ")}</p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border flex gap-2">
        {booking.status !== "completed" && (
          <>
            <button
              onClick={() => navigate(`/chat/${booking.id}`)}
              className="flex-1 py-3.5 rounded-2xl bg-input text-foreground font-bold text-sm hover:bg-muted active:scale-[0.98]"
            >
              Chat
            </button>
            <button
              onClick={() => navigate(`/tracking/${booking.id}`)}
              className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98]"
            >
              Track
            </button>
          </>
        )}
        {booking.status === "completed" && !booking.rating && (
          <button
            onClick={() => navigate(`/rating/${booking.id}`)}
            className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98]"
          >
            Rate Service
          </button>
        )}
        {booking.status === "completed" && booking.rating && (
          <button
            onClick={() => navigate("/bookings")}
            className="flex-1 py-3.5 rounded-2xl bg-input border border-border text-foreground font-bold text-sm active:scale-[0.98]"
          >
            Back to Bookings
          </button>
        )}
      </div>
    </div>
  );
};

const Row = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex items-center gap-2 py-1">
    <Icon size={14} className="text-primary" />
    <span className="text-xs text-foreground">{text}</span>
  </div>
);

export default BookingDetail;
