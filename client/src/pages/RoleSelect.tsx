import { useState } from "react";
import { User, Wrench, ArrowRight, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { checkProviderExists } from "@/lib/api";
import { motion, Variants } from "framer-motion";

const RoleSelect = () => {
  const navigate = useNavigate();
  const { dispatch, user } = useApp();
  const [loading, setLoading] = useState(false);

  const select = async (role: "customer" | "provider") => {
    dispatch({ type: "SET_ROLE", role });
    if (role === "customer") {
      navigate("/onboarding", { replace: true });
    } else {
      if (user.role === "provider") {
        navigate("/provider", { replace: true });
        return;
      }
      setLoading(true);
      try {
        const res = await checkProviderExists(user.id);
        if (res.exists) {
          dispatch({ type: "UPDATE_USER", user: { role: "provider" } });
          navigate("/provider", { replace: true });
          return;
        }
      } catch (err) {
        console.error("Failed to check provider:", err);
      } finally {
        setLoading(false);
      }
      navigate("/provider/select-service", { replace: true });
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
  } as any;

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 bg-[#F8FAFC] relative overflow-hidden">
      {/* Dynamic Backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[10%] left-[-15%] w-[300px] h-[300px] bg-accent/10 rounded-full blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-3 mb-6 relative z-10"
      >
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="text-white font-extrabold text-xl tracking-tighter">R</span>
        </div>
        <span className="text-2xl font-extrabold text-foreground tracking-tight">RoundU</span>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 flex flex-col relative z-10"
      >
        <motion.div variants={itemVariants} className="mt-6 mb-10">
          <h1 className="text-[34px] font-extrabold text-foreground leading-[1.15] tracking-tight">
            How would you like<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">to get started?</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed max-w-[280px]">
            Choose your role to personalize your experience on the platform.
          </p>
        </motion.div>

        <div className="flex flex-col gap-5 flex-1">
          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => select("customer")}
            className="group relative bg-white border-2 border-transparent hover:border-accent/20 rounded-[24px] p-6 text-left transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(245,158,11,0.1)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="w-14 h-14 rounded-[18px] bg-primary/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 group-hover:bg-accent/10">
                <User className="text-primary group-hover:text-accent transition-colors duration-300" size={28} strokeWidth={2} />
              </div>
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                <ArrowRight className="text-muted-foreground group-hover:text-accent transition-colors" size={16} strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-[20px] font-bold text-foreground mb-2 relative z-10 group-hover:text-primary transition-colors">Find a Service</h3>
            <p className="text-[14px] text-muted-foreground leading-relaxed relative z-10">
              Book trusted local professionals for your home needs in minutes.
            </p>
          </motion.button>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => select("provider")}
            className="group relative bg-white border-2 border-transparent hover:border-primary/20 rounded-[24px] p-6 text-left transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(21,46,75,0.1)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start justify-between">
              <div className="w-14 h-14 rounded-[18px] bg-accent/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500 group-hover:bg-primary/10">
                <Briefcase className="text-accent group-hover:text-primary transition-colors duration-300" size={28} strokeWidth={2} />
              </div>
              <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" size={16} strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-[20px] font-bold text-foreground mb-2 relative z-10 group-hover:text-primary transition-colors">Offer a Service</h3>
            <p className="text-[14px] text-muted-foreground leading-relaxed relative z-10">
              Grow your business by connecting with local customers instantly.
            </p>
          </motion.button>
        </div>

        <motion.p 
          variants={itemVariants}
          className="text-center text-[13px] font-medium text-muted-foreground/80 mt-8 mb-2"
        >
          By continuing, you agree to our Terms & Privacy Policy
        </motion.p>
      </motion.div>
    </div>
  );
};

export default RoleSelect;
