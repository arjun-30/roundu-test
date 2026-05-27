import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { updateUser } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const OnboardingName = () => {
  const navigate = useNavigate();
  const { user, dispatch } = useApp();
  const [name, setName] = useState(user.name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleContinue = async () => {
    if (name.trim().length < 2) {
      setError("Please enter a valid name");
      return;
    }
    setError("");
    
    setLoading(true);
    try {
      await updateUser(user.id, { name });
      dispatch({ type: "UPDATE_USER", user: { name } });
      setSuccess(`Welcome, ${name.split(" ")[0]}!`);
      setTimeout(() => navigate("/role", { replace: true }), 1200);
    } catch (error) {
      setError("Failed to save name");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div 
      className="min-h-screen flex flex-col px-7 py-8 bg-background relative overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(21, 46, 75, 0.03) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Ambient Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-15%] w-[300px] h-[300px] bg-accent/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header Logo & Center-aligned minimal dots */}
      <div className="flex items-center justify-between mb-6 relative z-10 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" className="opacity-30" />
            <path d="M12 6a6 6 0 0 1 6 6v1a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5v-1a6 6 0 0 1 6-6z" />
            <circle cx="12" cy="12" r="2.5" className="fill-accent stroke-accent" />
          </svg>
        </div>
        
        {/* Onboarding dots - Step 1 active */}
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div 
              key={s} 
              className={`h-1.5 rounded-full transition-all duration-300 ${s === 1 ? "w-6 bg-primary" : "w-1.5 bg-slate-300"}`}
            />
          ))}
        </div>
        
        {/* Spacer */}
        <div className="w-9 h-9" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col relative z-10"
      >
        <motion.div variants={itemVariants} className="mt-2 mb-8">
          <h1 className="text-[28px] font-extrabold text-slate-900 leading-[1.2] tracking-tight">
            What should we<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">call you?</span>
          </h1>
          <p className="text-[14px] text-slate-500 font-medium leading-relaxed mt-2">
            Enter your name to personalize your RoundU experience.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-semibold mb-6 border border-red-100 shadow-sm relative z-10"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-semibold mb-6 border border-emerald-100 shadow-sm relative z-10 flex items-center justify-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          variants={itemVariants}
          className="relative z-10 flex-1 flex flex-col gap-6"
        >
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-1">
              Full Name
            </label>
            <motion.div 
              className="relative group"
              animate={{
                scale: isFocused ? 1.01 : 1,
                boxShadow: isFocused ? "0 12px 25px -5px rgba(59,130,246,0.06)" : "0 4px 6px -1px rgba(0, 0, 0, 0.01)"
              }}
              transition={{ duration: 0.2 }}
            >
              <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isFocused ? 'text-[#3B82F6]' : 'text-slate-400'}`}>
                <User size={20} strokeWidth={2.5} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleContinue();
                }}
                placeholder="e.g. John Doe"
                autoFocus
                className={`w-full pl-14 pr-5 py-4.5 rounded-[20px] bg-white/70 backdrop-blur-sm text-slate-800 font-semibold placeholder:text-slate-300 focus:outline-none transition-all text-base border ${
                  isFocused ? 'border-[#3B82F6]' : 'border-slate-100'
                }`}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Action Footer */}
        <motion.div variants={itemVariants} className="mt-auto pt-8 relative z-10 flex-shrink-0">
          <motion.button
            whileHover={name.trim().length >= 2 ? { scale: 1.01 } : {}}
            whileTap={name.trim().length >= 2 ? { scale: 0.99 } : {}}
            onClick={handleContinue}
            disabled={name.trim().length < 2 || loading}
            className={`w-full py-4 rounded-[18px] font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
              name.trim().length >= 2
                ? "bg-gradient-to-r from-primary to-primary/95 text-white shadow-[0_8px_20px_rgba(21,46,75,0.15)] hover:shadow-[0_12px_25px_rgba(21,46,75,0.25)] cursor-pointer"
                : "bg-muted-foreground/10 text-muted-foreground/40 cursor-not-allowed border border-muted-foreground/5"
            }`}
          >
            <span>{loading ? "Saving..." : "Continue"}</span>
            {!loading && (
              <motion.div 
                className="relative"
                animate={name.trim().length >= 2 ? { x: [0, 4, 0] } : {}}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <ArrowRight size={18} strokeWidth={2.5} />
              </motion.div>
            )}
          </motion.button>
          
          <p className="text-center text-[12px] font-medium text-slate-400 mt-5 mb-2">
            You can always change this later in your profile.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default OnboardingName;
