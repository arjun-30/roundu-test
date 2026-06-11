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
  } as any;

  return (
    <div
      className="flex flex-col min-h-screen bg-[#F4F7FB]"
    >


      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-[#152E4B]" strokeWidth={2.5} />
        </button>

        {/* Onboarding dots for Provider registration (6 steps total) */}
        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${s === 1 ? "w-5 bg-[#152E4B]" : "w-1.5 bg-[#CBD5E1]"}`}
            />
          ))}
        </div>

        {/* Empty Spacer to balance back button */}
        <div className="w-8" />
      </div>

      <div className="flex-1 px-7 pt-6 pb-28 overflow-y-auto no-scrollbar relative z-10">
        <div className="mb-6">
          <h2 className="text-[28px] font-extrabold text-black leading-tight tracking-tight">What services do you offer?</h2>
          <p className="text-[14px]" style={{ color: "#64748B" }}>
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
            className="w-full h-12 pl-11 pr-4 bg-white border border-[#E2E8F0] rounded-[16px] text-sm font-medium focus:outline-none focus:border-[#152E4B] transition-all text-[#0F172A] placeholder:text-[#CBD5E1]"
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
                    className="flex items-center justify-between bg-white border-[#E2E8F0] rounded-[20px] p-3.5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[12px] bg-[#F1F5F9] flex items-center justify-center text-[#64748B]">
                        <service.icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">{service.label}</p>
                        <p className="text-[11px]" style={{ color: "#94A3B8" }}>{service.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-extrabold px-2 py-1 rounded-lg uppercase tracking-wider ${index === 0 ? 'bg-[#152E4B] text-white' : 'bg-slate-100 text-slate-500'
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
                className={`flex flex-col items-start p-5 rounded-[24px] border transition-all text-left relative overflow-hidden ${isSelected
                  ? 'border-[#152E4B] bg-white'
                  : 'bg-white border-[#E2E8F0] hover:border-[#C0C8D0]'
                  }`}
              >
                {/* Checkmark bubble */}
                <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${isSelected ? "border-[#152E4B] bg-[#152E4B] text-white scale-110" : "border-gray-200 bg-transparent text-transparent"}`}>
                  <Check size={11} strokeWidth={3} />
                </div>

                <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center mb-4 transition-colors duration-300 ${isSelected ? 'bg-[#152E4B]/10 text-[#152E4B]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                  <service.icon size={24} />
                </div>

                <h3 className="text-sm font-bold mb-1 text-[#0F172A]">
                  {service.label}
                </h3>
                <p className="text-[11px]" style={{ color: "#94A3B8" }}>
                  {service.desc}
                </p>
                {isSelected && (
                  <span className="mt-3 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#152E4B]/10 text-[#152E4B] uppercase tracking-wider block">
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
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-white/80 backdrop-blur-sm border-t border-gray-200 z-20">

        {/* Dynamic Selection Summary Text */}
        {selectedIds.length > 0 && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-xs font-bold text-[#0F172A] mb-3 uppercase tracking-wider animate-fade-in"
          >
            {selectedIds.length} {selectedIds.length === 1 ? 'service' : 'services'} selected
          </motion.p>
        )}

        <motion.button
          whileHover={canProceed ? { scale: 1.01 } : {}}
          whileTap={canProceed ? { scale: 0.99 } : {}}
          onClick={handleNext}
          disabled={!canProceed}
          className={`w-full py-4 rounded-[18px] font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${canProceed
            ? "bg-[#152E4B] text-white shadow-[0_8px_20px_rgba(21,46,75,0.15)] hover:shadow-[0_12px_25px_rgba(21,46,75,0.25)] cursor-pointer"
            : "bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600"
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
