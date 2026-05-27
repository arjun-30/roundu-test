import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { services } from '@/data/mockData';
import { motion, AnimatePresence } from 'framer-motion';

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div 
      className="flex flex-col min-h-screen bg-background relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(21, 46, 75, 0.03) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Ambient Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-15%] w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/70 backdrop-blur-md border-b border-slate-100/50">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-700" strokeWidth={2.5} />
        </button>
        
        {/* Onboarding dots for Provider registration (6 steps total) */}
        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${s === 1 ? "w-5 bg-primary" : "w-1.5 bg-slate-300"}`}
            />
          ))}
        </div>
        
        {/* Empty Spacer to balance back button */}
        <div className="w-8" />
      </div>

      <div className="flex-1 px-7 pt-6 pb-28 overflow-y-auto no-scrollbar relative z-10">
        <div className="mb-6">
          <h2 className="text-[28px] font-extrabold text-slate-900 leading-tight tracking-tight">What services do<br />you <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">offer?</span></h2>
          <p className="text-[14px] text-slate-500 font-medium mt-2 leading-relaxed">
            Choose your main expertise and up to 3 additional services you can provide.
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 bg-red-50 text-red-500 p-4 rounded-2xl text-sm font-semibold border border-red-100 shadow-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Input Box */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search services..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-white/70 backdrop-blur-sm border border-slate-100 rounded-[16px] text-sm font-medium focus:outline-none focus:border-[#3B82F6] transition-all text-slate-700 placeholder:text-slate-300 shadow-[0_4px_12px_rgba(0,0,0,0.01)]"
          />
        </div>

        {/* Selected Services Preview */}
        {selectedIds.length > 0 && (
          <div className="mb-6">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-3 block ml-1">Selected Services</h3>
            <div className="flex flex-col gap-3">
              {selectedIds.map((id, index) => {
                const service = services.find(s => s.id === id);
                if (!service) return null;
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={id} 
                    className="flex items-center justify-between bg-white/80 border border-slate-100 rounded-[20px] p-3.5 shadow-[0_6px_20px_rgba(0,0,0,0.01)] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[12px] bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
                        <service.icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{service.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{service.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-[9px] font-extrabold px-2 py-1 rounded-lg uppercase tracking-wider ${
                        index === 0 ? 'bg-[#3B82F6] text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {getBadgeText(index)}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Services Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4 pb-8"
        >
          {filteredServices.map((service) => {
            const isSelected = selectedIds.includes(service.id);
            const selectedIndex = selectedIds.indexOf(service.id);
            return (
              <motion.button
                key={service.id}
                variants={itemVariants}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => toggleService(service.id)}
                className={`flex flex-col items-start p-5 rounded-[24px] border transition-all text-left relative overflow-hidden ${
                  isSelected 
                    ? 'border-[#3B82F6] bg-[#3B82F6]/[0.015] shadow-[0_12px_25px_rgba(59,130,246,0.06)]' 
                    : 'bg-white/70 border-slate-100 hover:border-slate-200 shadow-[0_8px_20px_rgba(0,0,0,0.015)]'
                }`}
              >
                {/* Checkmark bubble */}
                <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  isSelected ? "border-[#3B82F6] bg-[#3B82F6] text-white scale-110" : "border-slate-200 bg-transparent text-transparent"
                }`}>
                  <Check size={11} strokeWidth={3} />
                </div>

                <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center mb-4 transition-colors duration-300 ${
                  isSelected ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 'bg-slate-100 text-slate-500'
                }`}>
                  <service.icon size={24} />
                </div>
                
                <h3 className={`text-sm font-bold mb-1 ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                  {service.label}
                </h3>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {service.desc}
                </p>
                {isSelected && (
                   <span className="mt-3 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] uppercase tracking-wider block">
                    {getBadgeText(selectedIndex)}
                  </span>
                )}
              </motion.button>
            );
          })}
          {filteredServices.length === 0 && (
            <div className="col-span-2 py-10 text-center">
              <p className="text-sm text-slate-400 font-medium">No services found matching "{search}"</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Footer / Continue button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-gradient-to-t from-background via-background to-transparent border-t border-slate-100/10 z-20">
        
        {/* Dynamic Selection Summary Text */}
        {selectedIds.length > 0 && (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-xs font-bold text-[#3B82F6] mb-3 uppercase tracking-wider animate-fade-in"
          >
            {selectedIds.length} {selectedIds.length === 1 ? 'service' : 'services'} selected
          </motion.p>
        )}

        <motion.button
          whileHover={canProceed ? { scale: 1.01 } : {}}
          whileTap={canProceed ? { scale: 0.99 } : {}}
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full py-4 rounded-[18px] font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
            canProceed
              ? "bg-gradient-to-r from-primary to-primary/95 text-white shadow-[0_8px_20px_rgba(21,46,75,0.15)] hover:shadow-[0_12px_25px_rgba(21,46,75,0.25)] cursor-pointer"
              : "bg-muted-foreground/10 text-muted-foreground/40 cursor-not-allowed border border-muted-foreground/5"
          }`}
        >
          <span className="text-[15px] font-bold">Continue to Details</span>
          <ChevronRight size={18} />
        </motion.button>
      </div>
    </div>
  );
};

export default SelectService;
