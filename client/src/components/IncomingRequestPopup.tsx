import { useState, useEffect } from "react";
import { ProviderRequest } from "@/data/mockData";
import { getServiceById } from "@/data/mockData";
import { X, Check, MapPin, Calendar, Clock, Star, Map, User, Navigation } from "lucide-react";

interface IncomingRequestPopupProps {
  request: any; // Can be ProviderRequest or JobBroadcast
  onAccept: () => void;
  onReject: () => void;
  isBroadcast?: boolean;
}

const IncomingRequestPopup = ({ request, onAccept, onReject, isBroadcast }: IncomingRequestPopupProps) => {
  const [timeLeft, setTimeLeft] = useState(120);
  const service = getServiceById(request.serviceId);

  useEffect(() => {
    if (timeLeft <= 0) {
      onReject();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onReject]);

  const percentage = (timeLeft / 120) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex justify-center items-start pt-12 p-4 bg-background/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Timer Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${timeLeft < 30 ? 'bg-destructive' : 'bg-primary'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Timer Badge */}
        <div className="absolute top-4 right-4 bg-background/80 backdrop-blur border border-border rounded-full px-3 py-1 flex items-center gap-1.5 shadow-sm">
          <Clock size={12} className={timeLeft < 30 ? 'text-destructive animate-pulse' : 'text-muted-foreground'} />
          <span className={`text-sm font-bold ${timeLeft < 30 ? 'text-destructive' : 'text-foreground'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>

        <div className="p-6 pb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
            {service && <service.icon size={32} className="text-primary" />}
          </div>

          <h2 className="text-xs uppercase tracking-wider font-bold text-primary mb-1">
            {isBroadcast ? "Live Job Alert" : "New Request"}
          </h2>
          <h1 className="text-2xl font-extrabold text-foreground leading-tight">{service?.label || request.serviceId}</h1>
          
          <div className="flex items-center gap-4 mt-4 bg-muted/50 rounded-2xl p-3 border border-border/50">
            <div className="w-12 h-12 rounded-full bg-input flex items-center justify-center text-lg font-bold">
              {request.customerName[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{request.customerName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-xs font-medium text-warning">
                  <Star size={12} fill="currentColor" /> {request.customerRating || "4.8"}
                </span>
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Navigation size={12} /> {request.distanceKm || "2.5"} km away
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-input/30 border-y border-border/50">
          <div className="space-y-3">
            <div className="flex gap-3">
              <MapPin size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-0.5">Location</p>
                <p className="text-sm font-medium text-foreground">{request.address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Calendar size={16} className="text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-0.5">Date & Time</p>
                <p className="text-sm font-medium text-foreground">{request.date} at {request.time}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs font-bold uppercase text-muted-foreground mb-1">{isBroadcast ? "Budget/Notes" : "Estimated Earnings"}</p>
          {isBroadcast ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground italic">"{request.notes || "No notes provided."}"</p>
              {request.voiceNoteUrl && (
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Voice Note Attached
                  </div>
                  <audio src={request.voiceNoteUrl} controls className="w-full h-8" />
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-3xl font-extrabold text-emerald-600">₹{request.price} - {request.price + 200}</p>
              <p className="text-xs text-muted-foreground mt-1">Final amount depends on work complexity</p>
              {request.voiceNoteUrl && (
                <div className="mt-3 bg-primary/5 border border-primary/10 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Voice Note Attached
                  </div>
                  <audio src={request.voiceNoteUrl} controls className="w-full h-8" />
                </div>
              )}
            </>
          )}
        </div>


        <div className="p-4 pt-0 grid grid-cols-2 gap-3 mt-auto">
          <button
            onClick={onReject}
            className="py-4 rounded-2xl bg-muted text-foreground font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 border border-border"
          >
            <X size={18} /> {isBroadcast ? "Skip" : "Decline"}
          </button>
          <button
            onClick={onAccept}
            className="py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-primary/30 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-active:translate-y-0 transition-transform" />
            <Check size={18} /> {isBroadcast ? "Provide Quote" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingRequestPopup;
