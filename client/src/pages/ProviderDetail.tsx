import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Clock, BadgeCheck, Briefcase, MessageCircle, Phone } from "lucide-react";
import { getProviderById, getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

const ProviderDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { selectedDate, selectedTime, dispatch } = useApp();
  const provider = getProviderById(id);
  if (!provider) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="text-sm text-primary">← Back</button>
        <p className="mt-4 text-muted-foreground">Provider not found.</p>
      </div>
    );
  }
  const service = getServiceById(provider.serviceId);

  const handleBook = () => {
    dispatch({ type: "SELECT_PROVIDER", id: provider.id });
    dispatch({ type: "SELECT_SERVICE", id: provider.serviceId });
    
    // Set default date/time for Quick Fix if they weren't set in the schedule flow
    if (!selectedDate) dispatch({ type: "SELECT_DATE", date: new Date().toISOString().slice(0, 10) });
    if (!selectedTime) dispatch({ type: "SELECT_TIME", time: "ASAP" });

    navigate("/booking/notes");
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Provider</h1>
      </div>

      <div className="px-5 flex-1 overflow-y-auto space-y-5">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card animate-fade-in-up" style={{ opacity: 0 }}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                {provider.avatar}
              </div>
              {provider.verified && (
                <BadgeCheck size={22} className="absolute -top-1 -right-1 text-accent fill-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-extrabold text-foreground">{provider.name}</h2>
              <p className="text-xs text-muted-foreground">{service?.label}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star size={14} className="text-accent fill-accent" />
                <span className="text-sm font-bold text-foreground">{provider.rating}</span>
                <span className="text-xs text-muted-foreground">({provider.reviews})</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
            <Stat icon={Briefcase} value={`${provider.experienceYrs}y`} label="Experience" />
            <Stat icon={MapPin} value={`${provider.distanceKm}km`} label="Distance" />
            <Stat icon={Clock} value={`${provider.etaMin}m`} label="ETA" />
          </div>
        </div>

        {provider.videoUrl && (
          <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.1s" }}>
            <h3 className="text-sm font-bold text-foreground mb-2">Introduction Video</h3>
            <div className="rounded-2xl overflow-hidden border border-border shadow-card bg-black aspect-video flex items-center justify-center">
              <video 
                src={provider.videoUrl} 
                controls 
                className="w-full h-full object-cover"
                poster="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80"
              />
            </div>
          </div>
        )}

        <div className="animate-fade-in-up" style={{ opacity: 0, animationDelay: "0.2s" }}>
          <h3 className="text-sm font-bold text-foreground mb-2">About</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{provider.bio}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Skills</h3>
          <div className="flex gap-2 flex-wrap">
            {provider.tags.map((t) => (
              <span key={t} className="text-[11px] font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">{t}</span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-foreground mb-2">Recent Reviews</h3>
          <div className="space-y-2">
            {[
              { n: "Anita S.", r: 5, t: "On time, very professional. Highly recommend!" },
              { n: "Karan M.", r: 4, t: "Great work and fair pricing." },
            ].map((r) => (
              <div key={r.n} className="bg-card border border-border rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{r.n}</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: r.r }).map((_, i) => (
                      <Star key={i} size={10} className="text-accent fill-accent" />
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{r.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 bg-card border-t border-border flex gap-2">
        <button className="w-12 h-12 rounded-2xl bg-input border border-border flex items-center justify-center">
          <Phone size={18} className="text-primary" />
        </button>
        <button className="w-12 h-12 rounded-2xl bg-input border border-border flex items-center justify-center">
          <MessageCircle size={18} className="text-primary" />
        </button>
        <button
          onClick={handleBook}
          className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98] transition-all"
        >
          Book Now — ₹{provider.pricePerHr}/hr
        </button>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, value, label }: { icon: any; value: string; label: string }) => (
  <div className="text-center">
    <Icon size={16} className="text-primary mx-auto mb-1" />
    <p className="text-sm font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export default ProviderDetail;
