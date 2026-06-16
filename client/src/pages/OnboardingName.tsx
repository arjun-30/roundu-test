import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, User } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { updateUser } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const OnboardingName = () => {
  const navigate = useNavigate();
  const { user, dispatch, isNewUser } = useApp();
  const initialName = user.name && user.name.toLowerCase().trim() !== "mock user" ? user.name : "";
  const [name, setName] = useState(initialName);
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
      setTimeout(() => {
        if (isNewUser) {
          navigate("/onboarding", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      }, 1200);
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
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  } as any;

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-[#F8FAFC] relative overflow-hidden">
      {/* Dynamic Background Elements (matching Login page) */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-accent/20 rounded-full blur-[80px] pointer-events-none" />

      {/* Main Container - Centered Content */}
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto px-6 py-8 justify-between relative z-10">

        {/* Header Navigation/Indicator */}
        <div className="flex items-center justify-between mb-12 flex-shrink-0">
          {/* Back Arrow */}
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-[16px] bg-white border-2 border-transparent hover:border-primary/10 flex items-center justify-center text-primary hover:bg-primary/5 transition-all active:scale-90 shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft size={22} strokeWidth={2.5} />
          </button>

          {/* Subtle Segmented Progress */}
          <div className="flex items-center gap-1.5 bg-slate-200/50 p-1.5 rounded-full border border-slate-100">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${s === 1 ? "w-8 bg-primary" : "w-2 bg-slate-400/50"}`}
              />
            ))}
          </div>
        </div>

        {/* Form Body - Centered Card */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col justify-center"
        >
          {/* Typography Header */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-black tracking-tight leading-tight sm:text-4xl">
              What should we <br />
              call you?
            </h1>
            <p className="text-slate-500 font-medium text-[15px] mt-3 leading-relaxed max-w-sm mx-auto">
              Enter your username to personalize your RoundU experience.
            </p>
          </motion.div>

          {/* Feedback Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-semibold mb-6 border border-rose-100 shadow-[0_4px_12px_rgba(244,63,94,0.05)] text-center"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-semibold mb-6 border border-emerald-100 shadow-[0_4px_12px_rgba(16,185,129,0.05)] flex items-center justify-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Section */}
          <motion.div variants={itemVariants} className="space-y-6">

            <div className="relative">
              <div className="flex flex-col">
                <label htmlFor="fullName" className="text-base font-semibold text-slate-600 mb-2">Username</label>
              </div>
              <div className="relative">
                <div className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isFocused ? 'text-primary' : 'text-slate-400'}`}>
                  <User size={20} strokeWidth={2.2} />
                </div>
                <input
                  id="fullName"
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
                  className={`w-full pl-14 pr-5 py-4 rounded-3xl bg-white text-slate-800 font-semibold placeholder:text-slate-400 focus:outline-none transition-all text-[15px] border ${isFocused ? 'border-primary ring-4 ring-primary/20 shadow-[0_12px_30px_rgba(59,130,246,0.12)]' : 'border-slate-200 hover:border-slate-300'}`}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Action Button & Info */}
        <div className="mt-8 flex-shrink-0">
          <motion.button
            whileHover={name.trim().length >= 2 ? { scale: 1.01 } : {}}
            whileTap={name.trim().length >= 2 ? { scale: 0.99 } : {}}
            onClick={handleContinue}
            disabled={name.trim().length < 2 || loading}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-300 ${name.trim().length >= 2
              ? "bg-[#152E4B] text-white shadow-[0_8px_25px_rgba(21,46,75,0.2)] hover:shadow-[0_12px_30px_rgba(21,46,75,0.3)] cursor-pointer"
              : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/30"
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

          <p className="text-center text-xs font-semibold text-slate-400 mt-4">
            You can always change this later in your profile.
          </p>
        </div>

      </div>
    </div>
  );
};

export default OnboardingName;
