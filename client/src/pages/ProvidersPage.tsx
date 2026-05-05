import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Filter, ArrowLeft, Frown } from "lucide-react";
import { getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import ProviderCard from "@/components/ProviderCard";
import FilterModal, { FilterValues } from "@/components/FilterModal";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";
import api from "@/lib/api";

const tabs = ["All", "Top Rated", "Nearest", "Budget", "Fastest"];
const defaultFilters: FilterValues = { maxPrice: 1000, minRating: 0, maxDistance: 50, availableOnly: false };

const ProvidersPage = () => {
  const { serviceId = "" } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const service = getServiceById(serviceId);
  const [tab, setTab] = useState(0);
  const [q, setQ] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/providers/search?serviceId=${serviceId}`);
        if (res.data.success) {
          setProviders(res.data.data);
        }
      } catch (err) {
        toast.error("Failed to fetch providers");
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, [serviceId]);

  const list = useMemo(() => {
    let l = providers;
    if (q) l = l.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    
    // Convert DB fields to frontend card fields if needed
    l = l.map(p => ({
      ...p,
      pricePerHr: p.price_per_hr || 299,
      rating: parseFloat(p.rating || "0"),
      reviews: Math.floor(Math.random() * 200) + 50, // Simulated reviews
      distanceKm: p.distance_km || 5, // Simulated for now
      etaMin: p.eta_min || 15, // Simulated for now
      available: p.is_online,
      avatar: p.avatar_url || p.name?.charAt(0) || "P",
      tags: ["Verified", "Fast"] // Default tags for now
    }));

    l = l.filter(
      (p) =>
        p.pricePerHr <= filters.maxPrice &&
        p.rating >= filters.minRating &&
        (!filters.availableOnly || p.available)
    );
    
    if (tab === 1) l = [...l].sort((a, b) => b.rating - a.rating);
    if (tab === 3) l = [...l].sort((a, b) => a.pricePerHr - b.pricePerHr);
    
    return l;
  }, [providers, q, filters, tab]);

  const handleBook = (id: string) => {
    dispatch({ type: "SELECT_PROVIDER", id });
    dispatch({ type: "SELECT_SERVICE", id: serviceId });
    
    // Create the booking immediately (Pay after work)
    const newBooking = {
      id: `bk-${Date.now()}`,
      providerId: id,
      serviceId: serviceId,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: "Quick fix requested",
      status: "assigned",
      createdAt: Date.now(),
      price: providers.find(p => p.id === id)?.pricePerHr || 299,
      paid: false, // Payment happens later
    };

    dispatch({ type: "ADD_BOOKING", booking: newBooking });
    toast.success("Booking confirmed!");
    navigate(`/booking/success/${newBooking.id}`);
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      <div className="px-5 pt-6 pb-2 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">{service?.label ?? "Providers"}</h1>
          <span className="text-xs text-muted-foreground ml-auto">{list.length} available</span>
        </div>

        <div className="relative mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search providers..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <button
            onClick={() => setFilterOpen(true)}
            className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center active:scale-95 transition-transform flex-shrink-0"
          >
            <Filter size={16} className="text-primary-foreground" />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                i === tab ? "bg-primary text-primary-foreground" : "bg-input border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Searching Providers...</p>
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={Frown} title="No providers match" description="Try clearing filters." />
        ) : (
          list.map((p, i) => (
            <div
              key={p.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 0.06}s`, opacity: 0 }}
            >
              <ProviderCard
                provider={p}
                onClick={() => {
                  dispatch({ type: "SELECT_PROVIDER", id: p.id });
                  navigate(`/provider/${p.id}`);
                }}
                onBook={() => handleBook(p.id)}
              />
            </div>
          ))
        )}
      </div>

      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        initial={filters}
        onApply={setFilters}
      />
    </div>
  );
};

export default ProvidersPage;
