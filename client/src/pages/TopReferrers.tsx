import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Crown, Medal, TrendingUp, Users, Gift, Sparkles } from "lucide-react";

interface Referrer {
  rank: number;
  name: string;
  referrals: number;
  earnings: string;
  avatarColor: string;
}

const mockReferrers: Referrer[] = [
  { rank: 1, name: "Aarav Sharma", referrals: 48, earnings: "₹24,000", avatarColor: "from-amber-400 to-yellow-500" },
  { rank: 2, name: "Priya Patel", referrals: 36, earnings: "₹18,000", avatarColor: "from-slate-300 to-slate-400" },
  { rank: 3, name: "Rohan Das", referrals: 29, earnings: "₹14,500", avatarColor: "from-amber-600 to-orange-700" },
  { rank: 4, name: "Ananya Iyer", referrals: 22, earnings: "₹11,000", avatarColor: "from-indigo-400 to-blue-500" },
  { rank: 5, name: "Vikram Malhotra", referrals: 19, earnings: "₹9,500", avatarColor: "from-emerald-400 to-teal-500" },
  { rank: 6, name: "Sneha Reddy", referrals: 15, earnings: "₹7,500", avatarColor: "from-rose-400 to-pink-500" },
  { rank: 7, name: "Kabir Mehta", referrals: 12, earnings: "₹6,000", avatarColor: "from-violet-400 to-purple-500" },
  { rank: 8, name: "Meera Nair", referrals: 10, earnings: "₹5,000", avatarColor: "from-sky-400 to-blue-500" },
];

const TopReferrers = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  // Split podium and list
  const podium = mockReferrers.slice(0, 3);
  const remaining = mockReferrers.slice(3);

  // Helper for Podium order (2nd, 1st, 3rd)
  const sortedPodium = [podium[1], podium[0], podium[2]];

  return (
    <div className="min-h-full flex flex-col bg-background pb-10 relative overflow-hidden">
      {/* Decorative Premium Elements */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95 hover:bg-muted transition-all cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
          <Trophy className="text-amber-500 animate-bounce" size={22} />
          Leaderboard
        </h1>
        <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center text-muted-foreground">
          <Sparkles className="text-amber-400 animate-pulse" size={18} />
        </div>
      </div>

      <div className="flex-1 px-6 space-y-6 relative z-10 pt-4 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          // SKELETON LOADING STATE
          <div className="space-y-6 animate-pulse">
            {/* Podium Skeleton */}
            <div className="flex justify-between items-end h-56 px-4 bg-muted/20 border border-border/40 rounded-3xl p-6">
              <div className="w-1/4 flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="h-4 w-12 bg-muted rounded" />
                <div className="h-16 w-full bg-muted rounded-t-xl" />
              </div>
              <div className="w-1/3 flex flex-col items-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-muted" />
                <div className="h-4 w-16 bg-muted rounded" />
                <div className="h-24 w-full bg-muted rounded-t-xl" />
              </div>
              <div className="w-1/4 flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-muted" />
                <div className="h-4 w-12 bg-muted rounded" />
                <div className="h-12 w-full bg-muted rounded-t-xl" />
              </div>
            </div>

            {/* List Skeleton */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-muted/20 border border-border/40 rounded-2xl">
                  <div className="w-6 h-6 bg-muted rounded-full" />
                  <div className="w-10 h-10 bg-muted rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                  <div className="h-5 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          // HIGH FIDELITY LEADERBOARD CONTENT
          <>
            {/* Podium Block */}
            <div className="relative bg-gradient-to-b from-primary/5 via-primary/0 to-transparent border border-primary/5 rounded-[32px] p-6 pt-8 flex justify-between items-end h-[240px] animate-scale-in">
              {sortedPodium.map((referrer, idx) => {
                const isFirst = referrer.rank === 1;
                const isSecond = referrer.rank === 2;

                return (
                  <div
                    key={referrer.rank}
                    className={`flex flex-col items-center flex-1 ${
                      isFirst ? "z-10 -translate-y-3 scale-110" : ""
                    }`}
                  >
                    {/* Crown or rank marker */}
                    <div className="relative mb-2">
                      {isFirst ? (
                        <Crown className="text-amber-400 absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce" size={24} />
                      ) : isSecond ? (
                        <Medal className="text-slate-400 absolute -top-4 left-1/2 -translate-x-1/2" size={18} />
                      ) : (
                        <Medal className="text-amber-700 absolute -top-4 left-1/2 -translate-x-1/2" size={18} />
                      )}

                      {/* Avatar */}
                      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${referrer.avatarColor} p-[2px] shadow-lg flex items-center justify-center text-white font-extrabold text-base sm:text-lg border-2 border-background`}>
                        {referrer.name.split(" ").map(n => n[0]).join("")}
                      </div>
                    </div>

                    <span className="text-xs font-black text-foreground max-w-[70px] truncate text-center leading-tight">
                      {referrer.name.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold mt-0.5">
                      {referrer.referrals} refs
                    </span>

                    {/* Pedestal block */}
                    <div
                      className={`w-full mt-3 rounded-t-2xl shadow-inner flex flex-col justify-center items-center text-white font-black text-sm relative overflow-hidden ${
                        isFirst
                          ? "bg-gradient-to-br from-amber-400 to-amber-500 h-16"
                          : isSecond
                          ? "bg-gradient-to-br from-slate-400 to-slate-500 h-12"
                          : "bg-gradient-to-br from-amber-700 to-amber-800 h-10"
                      }`}
                    >
                      <div className="absolute inset-0 bg-white/5 mix-blend-overlay" />
                      <span className="opacity-80">Rank</span>
                      <span className="text-lg leading-none">{referrer.rank}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Title Row */}
            <div className="flex items-center gap-2 px-1">
              <TrendingUp className="text-primary" size={18} strokeWidth={2.5} />
              <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Top Referral Rankings</h3>
            </div>

            {/* Scrollable Rank List */}
            <div className="space-y-3 animate-fade-in">
              {remaining.map((referrer) => (
                <div
                  key={referrer.rank}
                  className="flex items-center gap-4 p-4 bg-white border border-border/60 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 hover:scale-[1.01] transition-all duration-300"
                >
                  <span className="w-6 text-center text-sm font-black text-muted-foreground">{referrer.rank}</span>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${referrer.avatarColor} p-[2px] flex items-center justify-center text-white font-bold text-sm`}>
                    {referrer.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-extrabold text-foreground truncate">{referrer.name}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                      <Users size={10} />
                      {referrer.referrals} successful referrals
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[13px] font-black text-primary">{referrer.earnings}</span>
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Earned</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default TopReferrers;
