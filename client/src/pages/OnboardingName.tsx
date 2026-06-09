import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User, Sparkles } from "lucide-react";
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

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[#F8FAFC] relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-accent/20 rounded-full blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-12 mb-10 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-primary/10 shadow-sm mb-6">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent uppercase tracking-wider">
            Let's get started
          </span>
        </div>
        <h1 className="text-4xl font-extrabold text-foreground leading-[1.15] tracking-tight">
          What should we<br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">call you?</span>
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] max-w-[260px] leading-relaxed">
          Enter your name to personalize your RoundU experience.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10"
      >
        <label className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-3 block ml-1">
          Full Name
        </label>
        <motion.div 
          className="relative group"
          animate={{
            scale: isFocused ? 1.02 : 1,
            boxShadow: isFocused ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" : "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)"
          }}
          transition={{ duration: 0.2 }}
        >
          <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isFocused ? 'text-accent' : 'text-primary/40'}`}>
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
            placeholder="e.g. Arjun Kumar"
            autoFocus
            className={`w-full pl-14 pr-5 py-5 rounded-[20px] bg-white text-primary font-semibold placeholder:text-primary/30 focus:outline-none transition-all text-lg border-2 ${isFocused ? 'border-accent' : 'border-white'}`}
          />
        </motion.div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleContinue}
        disabled={name.trim().length < 2 || loading}
        className="mt-8 w-full py-5 rounded-[20px] font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(21,46,75,0.25)] relative overflow-hidden group z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span className="relative z-10">{loading ? "Saving..." : "Continue"}</span>
        {!loading && (
          <motion.div 
            className="relative z-10"
            animate={{ x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <ArrowRight size={20} strokeWidth={2.5} />
          </motion.div>
        )}
      </motion.button>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="mt-auto pt-10 text-center relative z-10 pb-4"
      >
        <p className="text-[13px] font-medium text-primary/40">
          You can always change this later in your profile.
        </p>
      </motion.div>
    </div>
  );
};

export default OnboardingName;
