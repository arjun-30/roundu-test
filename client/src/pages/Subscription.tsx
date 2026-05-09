import { useState } from "react";
import { ArrowLeft, Check, ChevronRight, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

interface Plan {
  id: string;
  name: string;
  priceMonthly: string;
  priceYearly: string;
  features: string[];
  isPopular?: boolean;
  active?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic Plan",
    priceMonthly: "₹999",
    priceYearly: "₹9,590",
    features: [
      "2 Housekeeping services",
      "1 Car Wash",
      "1 AC Cleaning"
    ],
  },
  {
    id: "pro",
    name: "Pro Plan",
    priceMonthly: "₹1,999",
    priceYearly: "₹19,190",
    isPopular: true,
    badge: "MOST POPULAR",
    features: [
      "6 Services across categories",
      "Priority booking",
      "10% discount on extra services"
    ],
  },
  {
    id: "advanced",
    name: "Advanced Plan",
    priceMonthly: "₹3,499",
    priceYearly: "₹33,590",
    features: [
      "10 Services across all categories",
      "Priority support",
      "Best value package"
    ]
  }
];

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
    <div className="min-h-full flex flex-col bg-white pb-24 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-4 border-b border-gray-100 sticky top-0 bg-white z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Choose a plan and save more on services</p>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="px-5 pt-6 pb-2">
        <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center relative">
          <div 
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-in-out ${
              billingCycle === "monthly" ? "left-1.5" : "left-[calc(50%+4.5px)]"
            }`}
          />
          <button 
            className={`flex-1 py-2.5 text-sm font-semibold z-10 transition-colors ${billingCycle === "monthly" ? "text-gray-900" : "text-gray-500"}`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly
          </button>
          <button 
            className={`flex-1 py-2.5 text-sm font-semibold z-10 transition-colors flex items-center justify-center gap-1.5 ${billingCycle === "yearly" ? "text-gray-900" : "text-gray-500"}`}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly
            <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="flex-1 px-5 pt-5 pb-6 space-y-6 overflow-y-auto">
        {plans.map((plan) => {
          const isPro = plan.id === "pro";
          const isActive = activePlan === plan.id;
          
          return (
            <div 
              key={plan.id}
              className={`relative bg-white rounded-[20px] p-6 transition-all duration-300 ${
                isPro 
                  ? "border-[2px] border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.12)]" 
                  : "border border-gray-200 shadow-sm hover:shadow-md"
              }`}
            >
              {isPro && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-[0.1em] px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md">
                  <Crown size={12} fill="currentColor" /> {plan.badge}
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[17px] font-extrabold text-gray-900">{plan.name}</h3>
                  {isActive && (
                    <span className="inline-block mt-1.5 bg-green-100 text-green-700 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md">
                      Active Plan
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  {billingCycle === "monthly" ? plan.priceMonthly : plan.priceYearly}
                </span>
                <span className="text-[13px] font-semibold text-gray-400">
                  /{billingCycle === "monthly" ? "mo" : "yr"}
                </span>
              </div>

              <div className="mt-6 space-y-3.5">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={12} className="text-blue-600" strokeWidth={3} />
                    </div>
                    <span className="text-[14px] text-gray-600 font-medium leading-snug">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full py-3.5 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    isActive
                      ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                      : isPro
                        ? "bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:bg-blue-700"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  {isActive ? "Manage Plan" : "Subscribe"}
                  {!isActive && <ChevronRight size={18} />}
                </button>
              </div>

              <div className="mt-3.5 text-center">
                <p className="text-[11.5px] text-gray-400 font-medium flex items-center justify-center gap-1.5">
                  Cancel anytime
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  );
};

export default Subscription;
