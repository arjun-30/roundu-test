import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, SearchX } from "lucide-react";
import { services, providers } from "@/data/mockData";
import ServiceCard from "@/components/ServiceCard";
import ProviderCard from "@/components/ProviderCard";
import { useApp } from "@/context/AppContext";
import EmptyState from "@/components/EmptyState";

const SearchPage = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [q, setQ] = useState("");

  const matchedServices = useMemo(() => {
    if (!q) return services.slice(0, 4);
    return services.filter((s) =>
      s.label.toLowerCase().includes(q.toLowerCase()) ||
      s.desc.toLowerCase().includes(q.toLowerCase())
    );
  }, [q]);

  const matchedProviders = useMemo(() => {
    if (!q) return [];
    return providers
      .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 5);
  }, [q]);

  const noResults = q && matchedServices.length === 0 && matchedProviders.length === 0;

  return (
    <div className="min-h-full flex flex-col bg-background">
      <div className="px-5 pt-6 pb-2 animate-fade-in">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services or pros..."
            className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
          <button
            onClick={() => navigate(-1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-card flex items-center justify-center"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-5 py-4 space-y-6 overflow-y-auto">
        {!q && (
          <p className="text-xs text-muted-foreground">Suggestions</p>
        )}

        {matchedServices.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">Services</h2>
            <div className="grid grid-cols-2 gap-3 items-stretch">
              {matchedServices.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  variant="compact"
                  onClick={() => {
                    navigate(`/service-select/${s.id}`);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {matchedProviders.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">Providers</h2>
            <div className="space-y-3">
              {matchedProviders.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  onClick={() => {
                    dispatch({ type: "SELECT_PROVIDER", id: p.id });
                    dispatch({ type: "SELECT_SERVICE", id: p.serviceId });
                    navigate(`/provider/${p.id}`);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {noResults && (
          <EmptyState
            icon={SearchX}
            title="No results found"
            description="Try searching with different keywords"
          />
        )}
      </div>
    </div>
  );
};

export default SearchPage;
