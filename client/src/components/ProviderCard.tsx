import { Star, MapPin, Clock, BadgeCheck } from "lucide-react";
import { Provider } from "@/data/mockData";

interface ProviderCardProps {
  provider: Provider;
  onClick?: () => void;
  onBook?: () => void;
}

const ProviderCard = ({ provider, onClick, onBook }: ProviderCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`bg-card border rounded-2xl p-4 transition-all active:scale-[0.98] shadow-card cursor-pointer ${
        provider.topRated ? "border-primary/30" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0 hover:bg-secondary transition-colors"
          >
            {provider.avatar}
          </div>
          {provider.verified && (
            <BadgeCheck size={18} className="absolute -top-1 -right-1 text-accent fill-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground text-sm">{provider.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {provider.rating === 0 ? (
              <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
            ) : (
              <div className="flex items-center gap-0.5">
                <Star size={12} className="text-accent fill-accent" />
                <span className="text-xs font-bold text-foreground">{Number(provider.rating || 0).toFixed(1)}</span>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground">({provider.reviews} reviews)</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin size={10} /> {provider.distanceKm} km
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock size={10} /> {provider.etaMin} min
            </span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {provider.tags.map((tag) => (
              <span
                key={tag}
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-base font-bold text-primary">₹{provider.pricePerHr}</span>
          <p className="text-[10px] text-muted-foreground">per hr</p>
          {onBook && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBook();
              }}
              className="mt-2 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold active:scale-95 transition-transform hover:bg-secondary"
            >
              Book
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
