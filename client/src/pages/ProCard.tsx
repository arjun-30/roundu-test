import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Check, Zap, Clock, ShieldCheck, CreditCard, ChevronRight } from "lucide-react";


const ProCard = () => {
  const navigate = useNavigate();
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = () => {
    setIsSubscribed(!isSubscribed);
  };

  const benefits = [
    { icon: Zap, label: "10% Instant Cashback", desc: "Earn on every single booking you make." },
    { icon: Clock, label: "Priority Matching", desc: "Get matched with top-rated pros in seconds." },
    { icon: Star, label: "Elite Professionals", desc: "Exclusive access to top 5% rated experts." },
    { icon: ShieldCheck, label: "Zero Cancellation Fee", desc: "Flexibility to change plans anytime." },
  ];

  return (
    <div className="min-h-full flex flex-col bg-[#0A0F1D] text-white pb-10 relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/2" />

      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">ProCard Membership</h1>
      </div>

      <div className="flex-1 px-6 space-y-8 relative z-10 pt-4 overflow-y-auto">
        {/* The Card - Masterpiece Design */}
        <div className="relative h-60 rounded-[40px] bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E293B] p-8 overflow-hidden shadow-[0_20px_50px_rgba(31,41,55,1)] border border-white/10 group animate-scale-in">
           {/* Shimmer Effect */}
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
           
           <div className="absolute top-0 right-0 p-8">
              <Star size={40} className="text-primary fill-primary animate-pulse" />
           </div>

           <div className="flex flex-col h-full justify-between relative z-10">
              <div>
                 <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Exclusive Access</span>
                 </div>
                 <h2 className="text-4xl font-black italic tracking-tighter">ProCard</h2>
              </div>

              <div>
                 <p className="text-[10px] font-bold text-white/50 mb-1">MEMBERSHIP ID</p>
                 <p className="text-sm font-mono tracking-widest text-white/90 uppercase">RU-8829-PRO-99</p>
              </div>
           </div>

           {/* Holographic lines */}
           <div className="absolute -bottom-10 -right-10 w-48 h-48 border border-white/5 rounded-full" />
           <div className="absolute -bottom-12 -right-12 w-48 h-48 border border-white/5 rounded-full" />
        </div>

        {/* Pricing Info */}
        <div className="text-center space-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
           <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Limited Time Offer</p>
           <div className="flex items-end justify-center gap-2">
              <span className="text-4xl font-black">₹199</span>
              <span className="text-lg font-bold text-white/40 mb-1">/ month</span>
           </div>
           <p className="text-xs text-white/50">Cancel anytime. No commitment.</p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
           {benefits.map((b, i) => (
             <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                   <b.icon className="text-primary" size={24} />
                </div>
                <div>
                   <p className="text-base font-extrabold">{b.label}</p>
                   <p className="text-xs text-white/40 mt-1">{b.desc}</p>
                </div>
             </div>
           ))}
        </div>

        {/* Extra Perks */}
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl p-5 border border-white/5 animate-fade-in" style={{ animationDelay: "0.4s" }}>
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <CreditCard size={20} className="text-primary" />
                 </div>
                 <div>
                    <p className="text-sm font-bold">Annual Savings</p>
                    <p className="text-[10px] text-white/40">Avg user saves ₹4,500/yr</p>
                 </div>
              </div>
              <ChevronRight className="text-white/20" size={20} />
           </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="px-6 pt-10 pb-4 relative z-10">
        <button
          onClick={handleSubscribe}
          className={`w-full py-5 rounded-3xl font-black text-lg transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-3 border-2 
            ${isSubscribed 
              ? "bg-transparent border-white/20 text-white" 
              : "bg-primary border-primary text-primary-foreground shadow-primary/30"
            }`}
        >
          {isSubscribed ? "Cancel Membership" : "Upgrade to ProCard"}
          <ArrowLeft className={isSubscribed ? "hidden" : "rotate-180"} size={22} strokeWidth={3} />
          {isSubscribed && <Check size={22} strokeWidth={3} />}
        </button>
      </div>
    </div>
  );
};

export default ProCard;
