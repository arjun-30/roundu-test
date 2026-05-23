import { useState } from "react";
import { ArrowLeft, Check, ChevronRight, Crown, Zap, Tag, Briefcase, Star, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

interface PlanFeature {
  text: string;
  icon: any;
}

interface Plan {
  id: string;
  name: string;
  priceMonthly: string;
  priceYearly: string;
  features: PlanFeature[];
  isPopular?: boolean;
  active?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter Plan",
    priceMonthly: "₹999",
    priceYearly: "₹9,590",
    features: [
      { text: "2 Housekeeping services", icon: Briefcase },
      { text: "1 Car Wash", icon: Briefcase },
      { text: "1 AC Cleaning", icon: Briefcase }
    ],
  },
  {
    id: "essential",
    name: "Essential Plan",
    priceMonthly: "₹1,999",
    priceYearly: "₹19,190",
    isPopular: true,
    badge: "MOST POPULAR",
    features: [
      { text: "6 Services across categories", icon: Star },
      { text: "Priority booking", icon: Zap },
      { text: "10% discount on extra services", icon: Tag }
    ],
  },
  {
    id: "premium",
    name: "Premium Plan",
    priceMonthly: "₹3,499",
    priceYearly: "₹33,590",
    features: [
      { text: "10 Services across all categories", icon: Sparkles },
      { text: "Priority support", icon: Zap },
      { text: "Best value package", icon: Tag }
    ]
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const Subscription = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activePlan, setActivePlan] = useState<string | null>(null);

  const handleSubscribe = (planId: string) => {
    if (activePlan === planId) {
      navigate('/subscriptions/manage');
      return;
    }
    setActivePlan(planId);
  };

  return (
    <div className="min-h-full flex flex-col bg-gradient-to-b from-slate-50 to-white pb-24 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-4 border-b border-border sticky top-0 bg-white/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-background flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
          >
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Subscriptions</h1>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Choose a plan and save more on services</p>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6 pb-2"
      >
        <div className="bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl flex items-center relative shadow-inner">
          <div 
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-md transition-all duration-300 ease-in-out ${
              billingCycle === "monthly" ? "left-1.5" : "left-[calc(50%+4.5px)]"
            }`}
          />
          <button 
            className={`flex-1 py-2.5 text-sm font-semibold z-10 transition-colors ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>
          <button 
            className={`flex-1 py-2.5 text-sm font-semibold z-10 transition-colors flex items-center justify-center gap-1.5 ${billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly
            <motion.span 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-[9px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider"
            >
              Save 20%
            </motion.span>
          </button>
        </div>
      </motion.div>

      {/* Plans */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 px-5 pt-5 pb-6 space-y-6 overflow-y-auto"
      >
        {plans.map((plan) => {
          const isPro = plan.id === "essential";
          const isActive = activePlan === plan.id;
          
          return (
            <motion.div 
              variants={itemVariants}
              key={plan.id}
              className="relative bg-white rounded-[20px] p-6 transition-all duration-300 border-[2px] border-gray-100 shadow-sm hover:border-accent hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] hover:scale-[1.02]"
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-extrabold uppercase tracking-[0.1em] px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                  <Crown size={12} fill="currentColor" /> {plan.badge}
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[17px] font-extrabold text-foreground">{plan.name}</h3>
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="inline-block mt-1.5 bg-green-100 text-green-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md"
                    >
                      Active Plan
                    </motion.span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-foreground tracking-tight">
                  {billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly}
                </span>
                <span className="text-[13px] font-semibold text-muted-foreground">
                  /{billingCycle === "monthly" ? "mo" : "yr"}
                </span>
              </div>

              <div className="mt-6 space-y-3.5">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isPro ? 'bg-accent/15' : 'bg-gray-100'}`}>
                      <feature.icon size={12} className={isPro ? 'text-accent' : 'text-gray-500'} strokeWidth={3} />
                    </div>
                    <span className="text-[14px] text-gray-700 font-medium leading-snug pt-0.5">{feature.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isActive
                      ? "bg-gray-100 text-foreground hover:bg-gray-200"
                      : "bg-accent/10 text-accent hover:bg-accent/20"
                  }`}
                >
                  {isActive ? "Manage Plan" : "Subscribe"}
                  {!isActive && <ChevronRight size={18} />}
                </button>
              </div>

              <div className="mt-3.5 text-center">
                <p className="text-[11.5px] text-muted-foreground font-medium flex items-center justify-center gap-1.5">
                  Cancel anytime
                </p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default Subscription;
