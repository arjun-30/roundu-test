import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { services } from '@/data/mockData';

const SelectService = () => {
  const navigate = useNavigate();
  const { providerRegistrationDraft, dispatch } = useApp();
  
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  
  const filteredServices = useMemo(() => {
    return services.filter(s => s.label.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const selectedIds = providerRegistrationDraft.serviceIds;
  
  const toggleService = (id: string) => {
    if (selectedIds.includes(id)) {
      dispatch({ 
        type: 'UPDATE_REGISTRATION_DRAFT', 
        patch: { serviceIds: selectedIds.filter(sId => sId !== id) } 
      });
    } else {
      if (selectedIds.length >= 4) {
        setError('You can select 1 primary and up to 3 secondary services.');
        setTimeout(() => setError(''), 3000);
        return;
      }
      dispatch({ 
        type: 'UPDATE_REGISTRATION_DRAFT', 
        patch: { serviceIds: [...selectedIds, id] } 
      });
    }
  };

  const getBadgeText = (index: number) => {
    return index === 0 ? 'Primary' : `Secondary ${index}`;
  };

  const canProceed = selectedIds.length > 0;

  const handleNext = () => {
    navigate('/provider/personal-details');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft size={22} className="text-foreground" strokeWidth={2.5} />
        </button>
        <h1 className="text-[17px] font-bold text-foreground">Select Service</h1>
        <span className="text-xs font-semibold text-muted-foreground">Step 1 of 6</span>
      </div>

      <div className="flex-1 p-5 pb-24 overflow-y-auto">
        <div className="mb-6 animate-fade-in">
          <h2 className="text-2xl font-extrabold text-foreground mb-2">What services do you offer?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Choose your main expertise and up to 3 additional services you can provide.
          </p>
        </div>

        {error && <div className="mb-4 bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}

        {/* Search */}
        <div className="relative mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search services..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-muted border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow text-foreground"
          />
        </div>

        {/* Selected Services Preview */}
        {selectedIds.length > 0 && (
          <div className="mb-6 animate-fade-in">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Selected</h3>
            <div className="flex flex-col gap-2">
              {selectedIds.map((id, index) => {
                const service = services.find(s => s.id === id);
                if (!service) return null;
                return (
                  <div key={id} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <service.icon size={20} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{service.label}</p>
                        <p className="text-[11px] text-muted-foreground">{service.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider ${
                        index === 0 ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {getBadgeText(index)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Services Grid */}
        <div className="grid grid-cols-2 gap-3 pb-8 animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
          {filteredServices.map((service) => {
            const isSelected = selectedIds.includes(service.id);
            const selectedIndex = selectedIds.indexOf(service.id);
            return (
              <button
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={`flex flex-col items-start p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
                  isSelected 
                    ? 'bg-primary/5 border-primary shadow-[0_4px_15px_rgba(var(--primary),0.1)]' 
                    : 'bg-card border-border hover:border-primary/40 shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 size={18} className="text-primary" fill="currentColor" stroke="var(--card)" />
                  </div>
                )}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/80'
                }`}>
                  <service.icon size={24} />
                </div>
                <h3 className={`text-sm font-bold mb-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {service.label}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {service.desc}
                </p>
                {isSelected && (
                   <span className="mt-3 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider block">
                    {getBadgeText(selectedIndex)}
                  </span>
                )}
              </button>
            );
          })}
          {filteredServices.length === 0 && (
            <div className="col-span-2 py-10 text-center">
              <p className="text-sm text-muted-foreground">No services found matching "{search}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer / Continue button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <button
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full max-w-[390px] mx-auto pointer-events-auto flex items-center justify-center gap-2 py-4 rounded-2xl transition-all shadow-lg ${
            canProceed 
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-80 shadow-none'
          }`}
        >
          <span className="text-[15px] font-bold">Continue to Details</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default SelectService;
