import { ArrowLeft, Crown, Calendar, Settings2, PauseCircle, PlayCircle, XCircle, Award, Sparkles, Percent, Zap, ShieldAlert, Home, Tag, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const ManageSubscriptions = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"active" | "paused" | "cancelled">("active");
  const [planId, setPlanId] = useState<"plus" | "premium">("plus");
  const [billingCycle, setBillingCycle] = useState<"weekly" | "monthly">("weekly");

  useEffect(() => {
    const saved = localStorage.getItem("roundu_active_plan");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.id === "premium") {
            setPlanId("premium");
          } else {
            setPlanId("plus");
          }
          if (parsed.billingCycle === "monthly") {
            setBillingCycle("monthly");
          } else {
            setBillingCycle("weekly");
          }
          if (parsed.status === "paused") {
            setStatus("paused");
          } else if (parsed.status === "cancelled") {
            setStatus("cancelled");
          } else {
            setStatus("active");
          }
        }
      } catch (e) {
        console.error("Failed to parse saved plan", e);
      }
    }
  }, []);

  const handleAction = (action: string) => {
    const saved = localStorage.getItem("roundu_active_plan");
    let currentData = saved ? JSON.parse(saved) : { id: planId, billingCycle };

    if (action === "pause") {
      setStatus("paused");
      currentData.status = "paused";
      localStorage.setItem("roundu_active_plan", JSON.stringify(currentData));
      toast.success("Subscription paused successfully.");
    } else if (action === "resume") {
      setStatus("active");
      currentData.status = "active";
      localStorage.setItem("roundu_active_plan", JSON.stringify(currentData));
      toast.success("Subscription resumed successfully.");
    } else if (action === "cancel") {
      setStatus("cancelled");
      currentData.status = "cancelled";
      localStorage.setItem("roundu_active_plan", JSON.stringify(currentData));
      toast.info("Subscription cancelled. You will have access until the end of your billing cycle.");
    }
  };

  const isPremium = planId === "premium";
  const planName = isPremium ? "RoundU Premium" : "RoundU Plus";
  const planPrice = isPremium 
    ? (billingCycle === "monthly" ? "₹499 / month" : "₹149 / week")
    : (billingCycle === "monthly" ? "₹199 / month" : "₹59 / week");

  const benefits = isPremium 
    ? [
        { text: "15% discount on bookings", icon: Percent },
        { text: "Highest priority access", icon: Zap },
        { text: "Emergency support", icon: ShieldAlert },
        { text: "Annual home maintenance inspection", icon: Home },
        { text: "Premium support & exclusive offers", icon: Award }
      ]
    : [
        { text: "10% discount on bookings", icon: Percent },
        { text: "Priority booking access", icon: Zap },
        { text: "Free cancellation & rescheduling", icon: Calendar },
        { text: "Exclusive member offers", icon: Tag },
        { text: "Faster customer support", icon: Heart }
      ];

  return (
    <div className="min-h-full flex flex-col bg-slate-50/70 pb-24 font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3 border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
          <ArrowLeft size={20} className="text-slate-800" />
        </button>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Manage Membership</h1>
      </div>

      <div className="px-5 pt-6 space-y-5 flex-1 overflow-y-auto">
        <div className={`rounded-[28px] p-6 border-2 shadow-md relative overflow-hidden transition-all duration-300 ${
          isPremium 
            ? "bg-slate-900 text-white border-transparent shadow-slate-900/10 shadow-xl" 
            : "bg-white text-slate-800 border-gray-100 hover:shadow-lg"
        }`}>
          {/* Decorative background glow for premium */}
          {isPremium && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl -mr-6 -mt-6"></div>
          )}

          <div className={`absolute top-5 right-5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-full border ${
            status === 'active' 
              ? 'bg-green-500/10 text-green-500 border-green-500/20' 
              : status === 'paused'
                ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}>
            {status}
          </div>

          <div className="flex flex-col mb-5 pt-1">
             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-sm border ${
               isPremium 
                 ? "bg-slate-800 border-slate-700 text-amber-400" 
                 : "bg-amber-50 border-amber-100 text-amber-500"
             }`}>
                <Crown size={28} className="fill-current" />
             </div>
             <h2 className="text-lg font-extrabold tracking-tight">{planName}</h2>
             <p className={`text-sm font-semibold mt-1 ${isPremium ? "text-amber-400" : "text-slate-900"}`}>{planPrice}</p>
          </div>

          <div className={`rounded-2xl p-5 mb-5 border space-y-4 ${
            isPremium ? "bg-slate-800/50 border-slate-800 text-slate-300" : "bg-slate-50 border-slate-100 text-slate-600"
          }`}>
             <div>
               <div className="flex items-center gap-3 mb-1.5">
                  <Calendar size={16} className={isPremium ? "text-amber-400" : "text-amber-500"} />
                  <p className={`text-xs font-bold ${isPremium ? "text-white" : "text-slate-800"}`}>Renewal / Cycle Date</p>
               </div>
                <p className="text-xs font-semibold ml-7">
                  {billingCycle === 'monthly' ? "Next Billing: June 26, 2026" : "Next Billing: June 2, 2026"}
                </p>
             </div>
             
             <div className={`h-px ${isPremium ? "bg-slate-800" : "bg-slate-200"}`} />
             
             <div>
               <div className="flex items-center gap-3 mb-2">
                  <Settings2 size={16} className={isPremium ? "text-amber-400" : "text-amber-500"} />
                  <p className={`text-xs font-bold ${isPremium ? "text-white" : "text-slate-800"}`}>Active Benefits</p>
               </div>
               
               <div className="ml-7 space-y-2 mt-1">
                 {benefits.slice(0, 3).map((b, i) => (
                   <div key={i} className="flex items-center gap-2 text-xs font-medium">
                     <b.icon size={12} className={isPremium ? "text-amber-400" : "text-amber-500"} />
                     <span>{b.text}</span>
                   </div>
                 ))}
               </div>
             </div>
          </div>

          <div className="space-y-3 mt-6">
            {status === "active" ? (
              <button 
                onClick={() => handleAction("pause")}
                className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all border ${
                  isPremium 
                    ? "bg-slate-800 text-orange-400 border-orange-500/20 hover:bg-slate-700" 
                    : "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100"
                }`}
              >
                <PauseCircle size={16} />
                Pause Membership
              </button>
            ) : status === "paused" ? (
              <button 
                onClick={() => handleAction("resume")}
                className="w-full py-3.5 rounded-xl bg-green-50 border border-green-100 text-green-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-100 active:scale-[0.98] transition-all"
              >
                <PlayCircle size={16} />
                Resume Membership
              </button>
            ) : (
              <button 
                onClick={() => {
                  setStatus("active");
                  const currentData = { id: planId, billingCycle, status: "active" };
                  localStorage.setItem("roundu_active_plan", JSON.stringify(currentData));
                  toast.success("Membership re-activated!");
                }}
                className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all"
              >
                <PlayCircle size={16} />
                Re-activate Membership
              </button>
            )}
            
            {status !== "cancelled" && (
              <button 
                onClick={() => handleAction("cancel")}
                className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all border ${
                  isPremium
                    ? "bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "bg-white border-red-100 text-red-500 hover:bg-red-50"
                }`}
              >
                <XCircle size={16} />
                Cancel Membership
              </button>
            )}

            <button 
              onClick={() => navigate('/subscriptions')}
              className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                isPremium
                  ? "bg-slate-850 border border-slate-800 text-slate-300 hover:bg-slate-800"
                  : "bg-gray-150 border border-gray-200 text-slate-700 hover:bg-gray-200"
              }`}
            >
              Change Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ManageSubscriptions;

