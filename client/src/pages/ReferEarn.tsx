import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Gift, Share2, Copy, Users, Wallet,
  ChevronRight, Award, Check, Link2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

const ReferEarn = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [notification, setNotification] = useState("");

  const referralCode = useMemo(() => {
    let base = (user?.id || user?.phone || "").replace(/\D/g, "").slice(-6);
    if (!base && user?.name) {
      base = user.name.split("").map(c => c.charCodeAt(0)).join("").slice(-6);
    }
    if (!base || base.length < 4) {
      base = "387407"; // Stable premium default
    }
    return `RU${base.toUpperCase()}`;
  }, [user?.id, user?.phone, user?.name]);

  const referralLink = `https://roundu.in/invite?ref=${referralCode}`;
  const shareMessage = `🎉 Get ₹500 off your first professional service on RoundU! Use my code *${referralCode}* or click: ${referralLink}`;

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(referralCode); } catch {
      const el = document.createElement("textarea");
      el.value = referralCode;
      document.body.appendChild(el); el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(referralLink); } catch {
      const el = document.createElement("textarea");
      el.value = referralLink;
      document.body.appendChild(el); el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Triggers native iOS/Android share sheet — works on HTTPS (production)
  const handleShare = async () => {
    // 1. Trigger native OS share sheet first to preserve transient user activation
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join RoundU & Get ₹500 Off!",
          text: shareMessage,
          url: referralLink,
        });
        return; // Native share successful
      } catch (error) {
        // If user aborted, just return
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    }

    // 2. Fallback: Automatically copy invite code/link to clipboard
    try { await navigator.clipboard.writeText(shareMessage); } catch {
      const el = document.createElement("textarea");
      el.value = shareMessage;
      document.body.appendChild(el); el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setNotification("Invite Link Copied!");
    setTimeout(() => setNotification(""), 4000);
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-10 relative overflow-hidden">
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
        <button
          onClick={handleShare}
          className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary active:scale-95 transition-all"
        >
          <Share2 size={18} />
        </button>
      </div>

      {notification && (
        <div className="absolute top-24 left-6 right-6 z-50 bg-primary text-white p-4 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 animate-bounce border border-primary-foreground/20">
          <Check size={18} className="text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="flex-1 px-6 space-y-6 relative z-10 pt-4 overflow-y-auto">
        {/* Hero */}
        <div className="text-center space-y-4 animate-scale-in">
          <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30">
            <Gift size={48} className="text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-foreground">Give ₹500, Get ₹500</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-[240px] mx-auto">
              Share the love of professional services and earn together!
            </p>
          </div>
        </div>

        {/* Code Card */}
        <div className="bg-card border-2 border-dashed border-primary/30 rounded-[32px] p-6 space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.2em] text-center">
            Your Referral Code
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-3xl font-black text-primary tracking-tighter">{referralCode}</span>
            <button onClick={copyCode} className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary active:scale-90 transition-all">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-2 bg-background border border-border rounded-2xl px-4 py-3">
            <Link2 size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="flex-1 text-xs text-muted-foreground truncate">{referralLink}</span>
            <button onClick={copyLink} className="text-xs font-bold text-primary active:opacity-60 flex-shrink-0">
              {linkCopied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Invite Button — opens native iOS/Android share sheet */}
          <button
            onClick={handleShare}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Invite Friends Now
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="bg-card border border-border p-5 rounded-3xl flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Users size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Friends Invited</p>
              <p className="text-xl font-black text-foreground">0</p>
            </div>
          </div>
          <div className="bg-card border border-border p-5 rounded-3xl flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Wallet size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Credits Earned</p>
              <p className="text-xl font-black text-foreground">₹0</p>
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
              { title: "Tap Share", desc: "Tap 'Invite Friends Now' to open the share sheet." },
              { title: "Friend books a service", desc: "They get ₹500 off on their first professional service booking." },
              { title: "You get rewarded", desc: "₹500 is credited to your wallet the moment they complete their booking!" },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary text-[10px] font-black">{i + 1}</div>
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
