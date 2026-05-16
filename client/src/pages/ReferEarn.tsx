import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Gift, Share2, Copy, Users, Wallet,
  ChevronRight, Award, Check, Link2, X
} from "lucide-react";
import { useApp } from "@/context/AppContext";

// Generate a deterministic referral code from the user ID
const generateReferralCode = (userId: string, phone: string): string => {
  const base = (userId || phone || "").replace(/\D/g, "").slice(-6);
  return `RU${base || Math.random().toString(36).slice(2, 7).toUpperCase()}`;
};

const ReferEarn = () => {
  const navigate = useNavigate();
  const { user } = useApp();
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  const referralCode = generateReferralCode(user.id, user.phone);
  const referralLink = `https://roundu.in/invite?ref=${referralCode}`;
  const shareMessage = `🎉 Get ₹500 off your first professional service on RoundU! Use my code *${referralCode}* or click: ${referralLink}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / web views
      const el = document.createElement("textarea");
      el.value = referralCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join RoundU & Get ₹500 Off!",
          text: shareMessage,
          url: referralLink,
        });
        return;
      } catch {
        // User cancelled or share failed – fall through to sheet
      }
    }
    // Fallback: show custom share sheet
    setShowShareSheet(true);
  };

  const shareViaWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
    setShowShareSheet(false);
  };

  const shareViaTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
    setShowShareSheet(false);
  };

  const shareViaSMS = () => {
    const url = `sms:?body=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank");
    setShowShareSheet(false);
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
        <button
          onClick={handleNativeShare}
          className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary active:scale-95 transition-all"
        >
          <Share2 size={18} />
        </button>
      </div>

      <div className="flex-1 px-6 space-y-6 relative z-10 pt-4 overflow-y-auto">
        {/* Hero Section */}
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
        <div
          className="bg-card border-2 border-dashed border-primary/30 rounded-[32px] p-6 space-y-4 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.2em] text-center">
            Your Referral Code
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-3xl font-black text-primary tracking-tighter">{referralCode}</span>
            <button
              onClick={copyCode}
              className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary active:scale-90 transition-all"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>

          {/* Referral Link */}
          <div className="flex items-center gap-2 bg-background border border-border rounded-2xl px-4 py-3">
            <Link2 size={14} className="text-muted-foreground flex-shrink-0" />
            <span className="flex-1 text-xs text-muted-foreground truncate">{referralLink}</span>
            <button
              onClick={copyLink}
              className="text-xs font-bold text-primary active:opacity-60 transition-opacity flex-shrink-0"
            >
              {linkCopied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Invite Button */}
          <button
            onClick={handleNativeShare}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Share2 size={18} />
            Invite Friends Now
          </button>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={shareViaWhatsApp}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-green-50 border border-green-100 active:scale-95 transition-all"
            >
              <img src="/whatsapp.svg" alt="WhatsApp" className="w-6 h-6" />
              <span className="text-[10px] font-bold text-green-700">WhatsApp</span>
            </button>
            <button
              onClick={shareViaTelegram}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-blue-50 border border-blue-100 active:scale-95 transition-all"
            >
              <img src="/telegram.svg" alt="Telegram" className="w-6 h-6" />
              <span className="text-[10px] font-bold text-blue-700">Telegram</span>
            </button>
            <button
              onClick={shareViaSMS}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-background border border-border active:scale-95 transition-all"
            >
              <span className="text-xl">💬</span>
              <span className="text-[10px] font-bold text-foreground">SMS</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
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
        <button className="w-full flex items-center justify-between p-5 rounded-3xl bg-secondary text-secondary-foreground shadow-lg shadow-secondary/10 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <Award size={24} className="text-amber-400" />
            </div>
            <div className="text-left">
              <p className="text-[13px] font-extrabold">Top Referrers</p>
              <p className="text-[10px] opacity-70">See the leaderboard</p>
            </div>
          </div>
          <ChevronRight size={20} />
        </button>

        {/* How it works */}
        <div className="space-y-4 animate-fade-in pb-4" style={{ animationDelay: "0.5s" }}>
          <h3 className="text-base font-extrabold text-foreground px-1">How it works</h3>
          <div className="space-y-4">
            {[
              { title: "Share your code", desc: "Send your unique code or link via WhatsApp, Telegram, or SMS." },
              { title: "Friend books a service", desc: "They get ₹500 off on their first professional service booking." },
              { title: "You get rewarded", desc: "₹500 is credited to your wallet the moment they complete their booking!" },
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

      {/* Custom Share Sheet Backdrop */}
      {showShareSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setShowShareSheet(false)}
        >
          <div
            className="w-full bg-background rounded-t-3xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-foreground">Share via</h3>
              <button
                onClick={() => setShowShareSheet(false)}
                className="w-8 h-8 rounded-full bg-input flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <ShareOption
                icon={<img src="/whatsapp.svg" alt="WhatsApp" className="w-7 h-7" />}
                label="WhatsApp"
                color="bg-green-50 border-green-100"
                textColor="text-green-700"
                onClick={shareViaWhatsApp}
              />
              <ShareOption
                icon={<img src="/telegram.svg" alt="Telegram" className="w-7 h-7" />}
                label="Telegram"
                color="bg-blue-50 border-blue-100"
                textColor="text-blue-700"
                onClick={shareViaTelegram}
              />
              <ShareOption
                icon={<span className="text-2xl">💬</span>}
                label="SMS"
                color="bg-background border-border"
                textColor="text-foreground"
                onClick={shareViaSMS}
              />
            </div>
            <button
              onClick={() => { copyLink(); setShowShareSheet(false); }}
              className="w-full py-4 rounded-2xl border border-border flex items-center justify-center gap-2 text-sm font-bold text-foreground active:scale-[0.98] transition-all"
            >
              <Link2 size={16} />
              {linkCopied ? "Link Copied!" : "Copy Referral Link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Share Option Component ───────────────────────────────────────────
const ShareOption = ({
  icon, label, color, textColor, onClick,
}: {
  icon: React.ReactNode; label: string; color: string; textColor: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 py-4 rounded-2xl border active:scale-95 transition-all ${color}`}
  >
    {icon}
    <span className={`text-[11px] font-bold ${textColor}`}>{label}</span>
  </button>
);

export default ReferEarn;
