import { useState, useEffect } from "react";
import { 
  ArrowLeft, Check, ChevronRight, Crown, Zap, Tag, Star, Sparkles,
  Wrench, Car, Home, Shield, Award, Calendar, Percent, ShieldAlert,
  Heart, CheckCircle2, HelpCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";

interface PlanFeature {
  text: string;
  icon: any;
}

interface Plan {
  id: string;
  name: string;
  subtitle: string;
  priceWeekly: number;
  priceMonthly: number;
  features: PlanFeature[];
  isPopular?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "plus",
    name: "RoundU Plus",
    subtitle: "Save on everyday essentials",
    priceWeekly: 59,
    priceMonthly: 199,
    features: [
      { text: "10% discount on every booking", icon: Percent },
      { text: "Priority booking access", icon: Zap },
      { text: "Free cancellation & rescheduling", icon: Calendar },
      { text: "Exclusive member offers", icon: Tag },
      { text: "Faster customer support", icon: Heart }
    ],
  },
  {
    id: "premium",
    name: "RoundU Premium",
    subtitle: "Ultimate savings & premium care",
    priceWeekly: 149,
    priceMonthly: 499,
    isPopular: true,
    badge: "MOST POPULAR",
    features: [
      { text: "15% discount on every booking", icon: Percent },
      { text: "Highest priority booking", icon: Zap },
      { text: "Emergency service support", icon: ShieldAlert },
      { text: "Annual home maintenance inspection", icon: Home },
      { text: "Premium customer support", icon: Award },
      { text: "Exclusive premium offers", icon: Sparkles }
    ]
  }
];

const categories = [
  { name: "Plumber", icon: Wrench },
  { name: "Electrician", icon: Zap },
  { name: "Car Wash", icon: Car },
  { name: "Housekeeping", icon: Home },
  { name: "Acting Drivers", icon: Shield },
  { name: "Expert Services", icon: Award },
];

const comparisonFeatures = [
  { name: "Discount", free: "0%", plus: "10%", premium: "15%", highlight: true },
  { name: "Priority Booking", free: "No", plus: "Yes", premium: "Highest" },
  { name: "Emergency Support", free: "No", plus: "No", premium: "Yes" },
  { name: "Annual Inspection", free: "No", plus: "No", premium: "Yes" },
  { name: "Exclusive Offers", free: "No", plus: "Yes", premium: "Yes" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

const Subscription = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"weekly" | "monthly">("weekly");
  const [activePlan, setActivePlan] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("roundu_active_plan");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setActivePlan(parsed.id);
        }
      } catch (e) {
        console.error("Failed to parse active plan", e);
      }
    }
  }, []);

  const handleSubscribe = (planId: string) => {
    if (activePlan) {
      navigate('/subscriptions/manage');
      return;
    }
    
    const newSubscription = {
      id: planId,
      billingCycle,
      subscribedAt: new Date().toISOString()
    };
    
    localStorage.setItem("roundu_active_plan", JSON.stringify(newSubscription));
    setActivePlan(planId);
    toast.success(`Welcome to ${planId === "plus" ? "RoundU Plus" : "RoundU Premium"}!`, {
      description: "Your membership benefits are now active.",
      duration: 3500,
    });
    
    setTimeout(() => {
      navigate('/subscriptions/manage');
    }, 800);
  };

  return (
    <div className="min-h-full flex flex-col bg-slate-50/70 pb-24 font-sans selection:bg-accent/30">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-4 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all border border-gray-100 shadow-sm"
          >
            <ArrowLeft size={20} className="text-slate-800" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              Membership <Crown size={18} className="text-amber-500 fill-amber-500 animate-pulse" />
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Maximize savings & booking priority</p>
          </div>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex-1 px-5 pt-6 pb-6 space-y-6 overflow-y-auto"
      >
        {/* Persuasive Hero Header */}
        <motion.div variants={itemVariants} className="text-center space-y-3.5 mt-2 bg-gradient-to-r from-slate-900 to-[#1e2d42] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-full blur-xl -mr-6 -mt-6"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -ml-12 -mb-12"></div>
          
          <h2 className="text-xl font-extrabold leading-tight text-white px-2 pt-2">
            Save more on every booking with RoundU Membership
          </h2>
          <p className="text-xs text-slate-300 font-medium">
            Use benefits across all service categories
          </p>

          {/* Service categories tags */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex flex-wrap justify-center gap-2 max-w-[340px] mx-auto">
              {categories.map((cat, i) => (
                <span key={i} className="flex items-center gap-1 text-[9px] bg-slate-800/80 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700/50 shadow-sm font-semibold">
                  <cat.icon size={9} className="text-amber-400" />
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Toggle */}
        <motion.div variants={itemVariants} className="pt-1">
          <div className="bg-gray-100/90 p-1.5 rounded-2xl flex items-center relative shadow-inner">
            <div 
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-in-out ${
                billingCycle === "weekly" ? "left-1.5" : "left-[calc(50%+4.5px)]"
              }`}
            />
            <button 
              className={`flex-1 py-2.5 text-xs font-bold z-10 transition-colors ${billingCycle === "weekly" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setBillingCycle("weekly")}
            >
              Weekly Billing
            </button>
            <button 
              className={`flex-1 py-2.5 text-xs font-bold z-10 transition-colors flex items-center justify-center gap-1.5 ${billingCycle === "monthly" ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly Billing
              <motion.span 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider scale-95"
              >
                Save 15%
              </motion.span>
            </button>
          </div>
        </motion.div>

        {/* Plan Cards */}
        <div className="space-y-6">
          {plans.map((plan) => {
            const isPremium = plan.isPopular;
            const isCurrentlyActive = activePlan === plan.id;
            const price = billingCycle === "weekly" ? plan.priceWeekly : plan.priceMonthly;
            
            return (
              <motion.div 
                variants={itemVariants}
                key={plan.id}
                className={`relative rounded-[28px] p-6 border-2 transition-all duration-300 shadow-md hover:scale-[1.01] ${
                  isPremium 
                    ? "bg-slate-900 text-white border-transparent shadow-slate-900/10 hover:shadow-xl hover:shadow-slate-900/20" 
                    : "bg-white text-slate-800 border-gray-100 hover:border-amber-400/50 hover:shadow-lg"
                }`}
              >
                {/* Popular badge */}
                {isPremium && (
                  <div className="absolute -top-3.5 left-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                    <Sparkles size={11} className="fill-white" /> {plan.badge}
                  </div>
                )}

                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-extrabold tracking-tight">{plan.name}</h3>
                    <p className={`text-xs mt-1 font-medium ${isPremium ? "text-slate-300" : "text-slate-500"}`}>
                      {plan.subtitle}
                    </p>
                  </div>
                  {isCurrentlyActive && (
                    <span className="bg-green-500/15 text-green-500 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg border border-green-500/25">
                      Active
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="mt-5 flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold tracking-tight ${isPremium ? "text-amber-400" : "text-slate-900"}`}>
                    ₹{price}
                  </span>
                  <span className={`text-xs font-semibold ${isPremium ? "text-slate-400" : "text-slate-500"}`}>
                    /{billingCycle === "weekly" ? "wk" : "mo"}
                  </span>
                  {billingCycle === "monthly" && (
                    <span className="ml-2 text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 font-bold px-2 py-0.5 rounded-md">
                      Save ₹{plan.priceWeekly * 4 - plan.priceMonthly}
                    </span>
                  )}
                </div>

                {/* Separation Line */}
                <div className={`h-px my-5 ${isPremium ? "bg-slate-800" : "bg-slate-100"}`} />

                {/* Benefits List */}
                <div className="space-y-3.5">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        isPremium ? "bg-slate-800 text-amber-400" : "bg-amber-50 text-amber-500"
                      }`}>
                        <feature.icon size={12} strokeWidth={2.5} />
                      </div>
                      <span className={`text-xs font-medium leading-snug pt-1 ${
                        isPremium ? "text-slate-200" : "text-slate-700"
                      }`}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subscribe Action Button */}
                <div className="mt-6">
                  <button 
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full py-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                      isCurrentlyActive
                        ? isPremium 
                          ? "bg-slate-800 hover:bg-slate-700 text-white" 
                          : "bg-gray-100 hover:bg-gray-200 text-slate-800"
                        : isPremium
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/20"
                          : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10"
                    }`}
                  >
                    {isCurrentlyActive ? "Manage Membership" : "Subscribe Now"}
                    {!isCurrentlyActive && <ChevronRight size={15} />}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Comparison Section */}
        <motion.div 
          variants={itemVariants} 
          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4"
        >
          <div className="text-center space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900">Compare Plans</h3>
            <p className="text-[10px] text-slate-500 font-semibold">Choose what fits your booking frequency</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5">Feature</th>
                  <th className="py-2.5 text-center">Free</th>
                  <th className="py-2.5 text-center text-slate-700">Plus</th>
                  <th className="py-2.5 text-center text-amber-500">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {comparisonFeatures.map((feat, idx) => (
                  <tr key={idx} className="text-xs hover:bg-slate-55/30 transition-colors">
                    <td className="py-3 font-semibold text-slate-700">{feat.name}</td>
                    <td className="py-3 text-center text-slate-400 font-medium">{feat.free}</td>
                    <td className="py-3 text-center font-bold text-slate-800">{feat.plus}</td>
                    <td className="py-3 text-center font-bold text-amber-500">{feat.premium}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQs Brief */}
        <motion.div variants={itemVariants} className="text-center pb-4">
          <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1">
            <HelpCircle size={12} /> Cancel, pause, or switch plans anytime in settings.
          </p>
        </motion.div>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default Subscription;
