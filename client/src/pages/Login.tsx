import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, ArrowRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { API_BASE_URL } from "@/config/env";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";

const loginSchema = z.object({
  phone: z.string().length(10, "Phone number must be exactly 10 digits").regex(/^\d+$/, "Must be numbers only"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const { register, handleSubmit, formState: { errors, isValid } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, { phone: data.phone });

      if (response.data.success) {
        dispatch({ type: "SET_PHONE", phone: data.phone });
        localStorage.setItem("roundu_pending_phone", data.phone);
        if (response.data.devOtp) {
          setSuccess(`Dev OTP: ${response.data.devOtp}`);
        } else {
          setSuccess("OTP sent successfully!");
        }
        setTimeout(() => navigate("/otp", { state: { devOtp: response.data.devOtp } }), 800);
      } else {
        setError(response.data.message || "Failed to send OTP");
      }
    } catch (err: any) {
      console.error('Send OTP Failed:', err);

      if (import.meta.env.DEV) {
        console.warn('[Login] Using Mock OTP fallback');
        dispatch({ type: "SET_PHONE", phone: data.phone });
        setSuccess("OTP sent (Mock Mode)");
        setTimeout(() => navigate("/otp"), 800);
      } else {
        setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
      }
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
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <button
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-[16px] bg-white border-2 border-transparent hover:border-primary/10 flex items-center justify-center text-primary hover:bg-primary/5 transition-all active:scale-90 shadow-sm"
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mt-12 mb-10 relative z-10"
      >
        <h1 className="text-4xl font-extrabold text-foreground leading-[1.15] tracking-tight">
          {isSignUp ? "Create an account" : "Welcome to "}<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">RoundU</span>
        </h1>
        <p className="text-muted-foreground mt-4 text-[15px] max-w-[260px] leading-relaxed">
          {isSignUp ? "Quick Sign-Up, Instant Access" : "Enter your phone number to continue."}
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
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-semibold mb-6 border border-emerald-100 shadow-sm relative z-10 flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <label className="text-xs font-bold text-primary/70 uppercase tracking-widest mb-3 block ml-1">
            Phone Number
          </label>
          <motion.div
            className="relative group"
            animate={{
              scale: isFocused ? 1.02 : 1,
              boxShadow: isFocused ? "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" : "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)"
            }}
            transition={{ duration: 0.2 }}
          >
            <div className={`absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-colors duration-300 ${isFocused ? 'text-accent' : 'text-primary/40'}`}>
              <Phone size={20} strokeWidth={2.5} />
              <span className={`text-[15px] font-bold ${isFocused ? 'text-primary' : 'text-foreground'}`}>+91</span>
              <div className={`w-[2px] h-5 rounded-full ${isFocused ? 'bg-accent/30' : 'bg-primary/10'}`} />
            </div>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              {...register("phone")}
              maxLength={10}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter your number"
              className={`w-full pl-[110px] pr-5 py-5 rounded-[20px] bg-white text-primary font-bold placeholder:text-primary/30 placeholder:font-semibold focus:outline-none transition-all text-lg border-2 tracking-wide ${errors.phone ? 'border-red-400' : isFocused ? 'border-accent' : 'border-white'}`}
            />
          </motion.div>
          {errors.phone && (
            <motion.p
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
              className="text-red-500 text-[11px] mt-2 font-bold ml-2"
            >
              {errors.phone.message}
            </motion.p>
          )}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          whileHover={isValid && !loading ? { scale: 1.02 } : {}}
          whileTap={isValid && !loading ? { scale: 0.98 } : {}}
          type="submit"
          disabled={!isValid || loading}
          className="w-full py-5 rounded-[20px] font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-primary text-white flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(21,46,75,0.25)] relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {loading ? (
            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
          ) : (
            <>
              <span className="relative z-10">{isSignUp ? "Sign Up" : "Next"}</span>
              <motion.div
                className="relative z-10"
                animate={{ x: [0, 4, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <ArrowRight size={20} strokeWidth={2.5} />
              </motion.div>
            </>
          )}
        </motion.button>
      </form>

    </div>
  );
};

export default Login;
