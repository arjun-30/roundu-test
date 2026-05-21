import { Calendar, Clock, MapPin } from "lucide-react";
import { Booking, getProviderById, getServiceById } from "@/data/mockData";

interface BookingCardProps {
  booking: Booking;
  onClick?: () => void;
}

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  assigned: "bg-primary/10 text-primary",
  on_the_way: "bg-accent/20 text-accent-foreground",
  arrived: "bg-accent/20 text-accent-foreground",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  assigned: "Assigned",
  on_the_way: "On the way",
  arrived: "Arrived",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const BookingCard = ({ booking, onClick }: BookingCardProps) => {
  const provider = (booking as any).providerDetails || getProviderById(booking.providerId) || {
    id: booking.providerId,
    name: "Service Provider",
    distanceKm: 2.5,
  };
  const service = getServiceById(booking.serviceId);
  if (!service) return null;
  return (
    <button
      onClick={onClick}
      className="w-full bg-card border border-border rounded-2xl p-4 text-left shadow-card active:scale-[0.98] transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <service.icon size={20} className="text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">{service.label}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyles[booking.status]}`}>
              {statusLabels[booking.status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">with {provider.name}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar size={10} /> {booking.date}</span>
            <span className="flex items-center gap-1"><Clock size={10} /> {booking.time}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-bold text-primary">₹{booking.price}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin size={10} /> {provider.distanceKm} km
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

export default BookingCard;
