import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Wrench, Droplets, Zap, Sparkles, Car, Paintbrush, Box, CheckCircle2, HelpCircle, ShieldCheck, Clock, ThumbsUp, Loader2, ArrowRight, Check } from "lucide-react";
import { getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

// Icon mapper
const getProblemIcon = (str: string) => {
  const l = str.toLowerCase();
  if (l.includes("water") || l.includes("leak") || l.includes("tap") || l.includes("clog") || l.includes("drain")) return Droplets;
  if (l.includes("electric") || l.includes("wire") || l.includes("switch") || l.includes("trip") || l.includes("fan") || l.includes("power") || l.includes("light") || l.includes("fuse")) return Zap;
  if (l.includes("clean") || l.includes("wash") || l.includes("spa") || l.includes("dust")) return Sparkles;
  if (l.includes("car") || l.includes("drive")) return Car;
  if (l.includes("paint") || l.includes("color")) return Paintbrush;
  if (l.includes("install") || l.includes("setup")) return Box;
  return Wrench;
};

const ServiceSelection = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { dispatch } = useApp();

  const service = getServiceById(serviceId || "");
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Acting Drivers has its own dedicated booking screen — redirect immediately
  useEffect(() => {
    if (serviceId === "drivers") {
      navigate(`/book-driver/${serviceId}`, { replace: true });
    }
  }, [serviceId, navigate]);

  // Reset any previous booking draft (like descriptions/voice notes) when selecting a new service
  useEffect(() => {
    dispatch({ type: "RESET_BOOKING_DRAFT" });
  }, [dispatch, serviceId]);

  if (!service) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-10 text-center bg-background">
        <h2 className="text-lg font-bold text-foreground mb-2">Service not found</h2>
        <button onClick={() => navigate("/home")} className="text-primary font-bold">Go back home</button>
      </div>
    );
  }

  if (serviceId === "drivers") return null;


  const toggleSelection = (problem: string) => {
    setSelectedProblems(prev => {
      if (prev.includes(problem)) {
        return prev.filter(p => p !== problem);
      } else {
        return [...prev, problem];
      }
    });
  };

  const handleContinue = () => {
    if (selectedProblems.length === 0) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      dispatch({ type: "SELECT_SERVICE", id: service.id });
      navigate(`/book-service/${service.id}`, {
        state: {
          serviceId: service.id,
          issue: selectedProblems.join(", ")
        }
      });
    }, 400);
  };



  // Mock expansion to closely emulate user's examples
  const getExtendedProblems = () => {
    const list = service.commonProblems ? [...service.commonProblems] : [];
    if (service.id === "plumber" && !list.includes("Drain cleaning")) list.push("Drain cleaning", "Pipe installation", "Low water pressure", "Bathtub repair");
    if (service.id === "electrician" && !list.includes("Power outage")) list.push("Power outage", "Light installation", "Wiring issue", "Fuse problem");
    if (!list.includes("Other")) list.push("Other");
    return list;
  }

  const problemsList = getExtendedProblems();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  } as any;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F8FAFC] pb-6 font-sans text-foreground relative overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-5 pt-6 pb-4 flex items-center gap-3 bg-white shadow-sm sticky top-0 z-20"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/home")}
          className="w-11 h-11 rounded-[16px] bg-[#F8FAFC] flex flex-shrink-0 items-center justify-center border-2 border-transparent hover:border-primary/10 transition-all shadow-sm"
        >
          <ArrowLeft size={22} className="text-primary" strokeWidth={2.5} />
        </motion.button>
        <div>
          <h1 className="text-[22px] font-extrabold text-foreground leading-tight tracking-tight">{service.label}</h1>
          <p className="text-[13px] text-muted-foreground font-medium">Fine-tune your request</p>
        </div>
        {selectedProblems.length > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto bg-accent/15 text-accent text-[12px] font-extrabold px-3 py-1.5 rounded-full"
          >
            {selectedProblems.length} selected
          </motion.span>
        )}
      </motion.div>

      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6 space-y-8 relative z-10">

        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-[24px] font-extrabold text-foreground tracking-tight">What's the problem?</h2>
          <p className="text-[14px] text-muted-foreground mt-1 leading-snug">Select one or more issues to help us match the right expert.</p>
        </motion.div>

        {/* Dynamic Grid */}
        {problemsList.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4 relative"
          >
            {/* Loading Overlay */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-[-10px] bg-white/50 backdrop-blur-sm z-10 rounded-3xl flex items-center justify-center"
                >
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </motion.div>
              )}
            </AnimatePresence>

            {problemsList.map((problem) => {
              const isActive = selectedProblems.includes(problem);
              const IconComponent = getProblemIcon(problem);

              return (
                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  key={problem}
                  onClick={() => toggleSelection(problem)}
                  className={`flex flex-col items-start p-5 rounded-[24px] border-2 transition-all duration-300 relative shadow-sm text-left overflow-hidden ${isActive
                      ? "border-accent bg-accent/5 shadow-[0_8px_30px_rgba(245,158,11,0.15)]"
                      : "border-transparent bg-white hover:border-primary/10 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                    }`}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-br from-white via-white to-accent/10 opacity-100"
                    />
                  )}
                  {/* SVG Icon Top */}
                  <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center mb-4 transition-colors relative z-10 ${isActive ? 'bg-accent/20 text-accent' : 'bg-[#F8FAFC] text-primary group-hover:bg-primary/5'}`}>
                    <IconComponent size={24} strokeWidth={2} />
                  </div>

                  {/* Label */}
                  <span className={`text-[14px] font-bold leading-snug relative z-10 transition-colors ${isActive ? "text-foreground" : "text-foreground"
                    }`}>
                    {problem}
                  </span>

                  {/* Active Indicator Checkmark */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-4 right-4 z-10"
                      >
                        <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-md shadow-accent/30">
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Helper Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-transparent flex flex-col sm:flex-row items-start sm:items-center gap-5 mt-4"
        >
          <div className="w-14 h-14 rounded-[20px] bg-primary/5 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={26} className="text-primary" strokeWidth={2} />
          </div>
          <div className="flex-1 w-full">
            <h3 className="text-[17px] font-extrabold text-foreground">Not sure what's wrong?</h3>
            <p className="text-[13px] text-muted-foreground mt-1 mb-4 leading-relaxed">Let our experts inspect and identify the exact issue for you.</p>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/get-help/${service.id}`)}
              className="bg-primary text-white text-[13px] font-bold tracking-wide px-5 py-3 rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors w-full sm:w-auto"
              id="get-help-trigger-btn"
            >
              Get Help
            </motion.button>
          </div>
        </motion.div>

        {/* Trust Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex gap-4 items-end justify-between opacity-80 px-2 pt-4 pb-2"
        >
          <span className="flex flex-col items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground text-center uppercase tracking-widest"><ShieldCheck size={28} className="text-secondary/70 mb-1" strokeWidth={1.5} /> Verified<br />Experts</span>
          <span className="flex flex-col items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground text-center uppercase tracking-widest"><Clock size={28} className="text-primary/70 mb-1" strokeWidth={1.5} /> On-time<br />Service</span>
          <span className="flex flex-col items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground text-center uppercase tracking-widest"><ThumbsUp size={28} className="text-accent/70 mb-1" strokeWidth={1.5} /> 100%<br />Satisfaction</span>
        </motion.div>
      </div>

      {/* Sticky Continue Button */}
      <AnimatePresence>
        {selectedProblems.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="sticky bottom-0 left-0 right-0 z-30 px-5 pb-6 pt-3 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-[20px] bg-accent text-white font-extrabold text-[16px] shadow-[0_8px_30px_rgba(245,158,11,0.3)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.4)] transition-all disabled:opacity-60 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 pointer-events-none" />
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue with {selectedProblems.length} {selectedProblems.length === 1 ? 'issue' : 'issues'}
                  <ArrowRight size={20} strokeWidth={2.5} />
                </>
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ServiceSelection;
