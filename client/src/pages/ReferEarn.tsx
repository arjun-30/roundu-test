import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, Share2, Copy, Users, Wallet, ChevronRight, Award, Check } from "lucide-react";

const ReferEarn = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const referralCode = "ROUNDU750";

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    // Sharing logic
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-10 relative overflow-hidden">
      {/* Decorative Premium Elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Refer & Earn</h1>
        <button className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Share2 size={18} />
        </button>
      </div>

      <div className="flex-1 px-6 space-y-8 relative z-10 pt-4 overflow-y-auto">
        {/* Hero Section */}
        <div className="text-center space-y-4 animate-scale-in">
          <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30">
            <Gift size={48} className="text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-foreground">Give ₹500, Get ₹500</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-[240px] mx-auto">Share the love of professional services and earn together!</p>
          </div>
        </div>

        {/* Code Card */}
        <div className="bg-card border-2 border-dashed border-primary/30 rounded-[32px] p-6 text-center space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.2em]">Your Referral Code</p>
          <div className="flex items-center justify-center gap-4">
             <span className="text-3xl font-black text-primary tracking-tighter">{referralCode}</span>
              <button 
                onClick={copyCode}
                className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary active:scale-90 transition-all"
             >
               {copied ? <Check size={18} /> : <Copy size={18} />}
             </button>
          </div>
          <button 
            onClick={handleShare}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Invite Friends Now
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="bg-card border border-border p-5 rounded-3xl flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary/100/10 flex items-center justify-center">
              <Users size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Friends Shared</p>
              <p className="text-xl font-black text-foreground">12</p>
            </div>
          </div>
          <div className="bg-card border border-border p-5 rounded-3xl flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Wallet size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Earned Credits</p>
              <p className="text-xl font-black text-foreground">₹6,000</p>
            </div>
          </div>
        </div>

        {/* Leaderboard Button */}
        <button 
          onClick={() => navigate("/top-referrers")}
          className="w-full flex items-center justify-between p-5 rounded-3xl bg-secondary text-secondary-foreground shadow-lg shadow-secondary/10 animate-fade-in active:scale-[0.97] hover:scale-[1.01] hover:bg-secondary/95 hover:shadow-xl hover:shadow-secondary/20 transition-all duration-300 cursor-pointer group" 
          style={{ animationDelay: "0.4s" }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <Award size={24} className="text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-extrabold">Top Referrers</p>
              <p className="text-[10px] opacity-70">See the leaderboard</p>
            </div>
          </div>
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
        </button>

        {/* How it works */}
        <div className="space-y-4 animate-fade-in pb-4" style={{ animationDelay: "0.5s" }}>
           <h3 className="text-base font-extrabold text-foreground px-1">How it works</h3>
           <div className="space-y-4">
              {[
                { title: "Invite your friends", desc: "Share your code via WhatsApp or Socials." },
                { title: "They book a service", desc: "They get ₹500 off on their first professional service." },
                { title: "You get rewarded", desc: "₹500 is credited to your wallet instantly!" },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary text-[10px] font-black">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReferEarn;
