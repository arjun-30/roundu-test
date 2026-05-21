import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Trophy, Crown, Medal, TrendingUp, Users,
  Gift, Sparkles, Check, Copy, Share2
} from "lucide-react";
import { fetchReferralLeaderboard, fetchReferralCode } from "@/lib/api";

interface Referrer {
  rank: number;
  name: string;
  referrals: number;
  earnings: number;
  userId: string;
}

const TopReferrers = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<Referrer[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<{ rank: number | null; referrals: number; earnings: number } | null>(null);
  const [userReferralCode, setUserReferralCode] = useState("");
  const [userShareUrl, setUserShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const [leaderboardRes, codeRes] = await Promise.all([
          fetchReferralLeaderboard(),
          fetchReferralCode()
        ]);
        
        if (active) {
          if (leaderboardRes.success) {
            setLeaderboardData(leaderboardRes.data.leaderboard || []);
            setCurrentUserRank(leaderboardRes.data.currentUser || null);
          }
          if (codeRes.success) {
            setUserReferralCode(codeRes.data.code);
            setUserShareUrl(codeRes.data.shareUrl);
          }
        }
      } catch (err) {
        console.error("Failed to load leaderboard data:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const referralLink = userShareUrl || `https://roundu.in/invite?ref=${userReferralCode}`;
  const shareMessage = `🎉 Get ₹500 off your first professional service on RoundU! Use my code *${userReferralCode}* or click: ${referralLink}`;

  const copyCode = async () => {
    if (!userReferralCode) return;
    try { await navigator.clipboard.writeText(userReferralCode); } catch {
      const el = document.createElement("textarea");
      el.value = userReferralCode;
      document.body.appendChild(el); el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!userReferralCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join RoundU & Get ₹500 Off!",
          text: shareMessage,
          url: referralLink,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
      }
    }

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

  // Helper for Podium colors
  const getAvatarColor = (rank: number) => {
    if (rank === 1) return "from-amber-400 to-yellow-500";
    if (rank === 2) return "from-slate-300 to-slate-400";
    if (rank === 3) return "from-amber-600 to-orange-700";
    const colors = [
      "from-indigo-400 to-blue-500",
      "from-emerald-400 to-teal-500",
      "from-rose-400 to-pink-500",
      "from-violet-400 to-purple-500",
      "from-sky-400 to-blue-500",
    ];
    return colors[(rank - 4) % colors.length] || "from-slate-400 to-slate-500";
  };

  // Split podium and list
  const podium = useMemo(() => leaderboardData.slice(0, 3), [leaderboardData]);
  const remaining = useMemo(() => leaderboardData.slice(3), [leaderboardData]);

  // Helper for Podium order (2nd, 1st, 3rd)
  const sortedPodium = useMemo(() => {
    const list = [];
    if (podium.length >= 2 && podium[1]) list.push(podium[1]);
    if (podium.length >= 1 && podium[0]) list.push(podium[0]);
    if (podium.length >= 3 && podium[2]) list.push(podium[2]);
    return list;
  }, [podium]);

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

      {notification && (
        <div className="absolute top-24 left-6 right-6 z-50 bg-primary text-white p-4 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-3 animate-bounce border border-primary-foreground/20">
          <Check size={18} className="text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="flex-1 px-6 space-y-6 relative z-10 pt-4 overflow-y-auto custom-scrollbar flex flex-col">
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
        ) : leaderboardData.length === 0 ? (
          // EMPTY STATE
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 space-y-6 animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Trophy size={36} className="text-amber-500/80" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-foreground">No referral rankings yet</h2>
              <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
                Start inviting friends to appear on the leaderboard!
              </p>
            </div>

            {/* Share section */}
            <div className="w-full bg-card border border-border/80 rounded-3xl p-5 space-y-4 max-w-sm">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Your Referral Code
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl font-black text-primary tracking-tight">
                  {userReferralCode || "..."}
                </span>
                {userReferralCode && (
                  <button
                    onClick={copyCode}
                    className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary active:scale-90 transition-all cursor-pointer"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2 text-left">
                <span className="flex-1 text-[10px] text-muted-foreground truncate">{referralLink}</span>
              </div>

              <button
                onClick={handleShare}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-extrabold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 size={16} />
                Invite Friends
              </button>
            </div>
          </div>
        ) : (
          // HIGH FIDELITY LEADERBOARD CONTENT
          <div className="space-y-6">
            {/* Podium Block */}
            {sortedPodium.length > 0 && (
              <div className="relative bg-gradient-to-b from-primary/5 via-primary/0 to-transparent border border-primary/5 rounded-[32px] p-6 pt-8 flex justify-between items-end h-[240px] animate-scale-in">
                {sortedPodium.map((referrer) => {
                  const isFirst = referrer.rank === 1;
                  const isSecond = referrer.rank === 2;
                  const avatarColor = getAvatarColor(referrer.rank);

                  return (
                    <div
                      key={referrer.userId}
                      className={`flex flex-col items-center ${
                        sortedPodium.length > 1 ? "flex-1" : "mx-auto w-1/3"
                      } ${isFirst ? "z-10 -translate-y-3 scale-110" : ""}`}
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
                        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br ${avatarColor} p-[2px] shadow-lg flex items-center justify-center text-white font-extrabold text-base sm:text-lg border-2 border-background`}>
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
            )}

            {/* Current User Stats Card */}
            {currentUserRank && currentUserRank.referrals > 0 && (
              <div className="bg-card border border-border/80 rounded-[28px] p-5 space-y-4 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="text-amber-500" size={18} />
                    <span className="text-xs font-black text-foreground uppercase tracking-wider">Your Progress</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold">
                    Rank {currentUserRank.rank || "Unranked"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-border/40 py-3">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Total Referrals</p>
                    <p className="text-lg font-black text-foreground mt-0.5">{currentUserRank.referrals}</p>
                  </div>
                  <div className="text-center border-l border-border/40">
                    <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Rewards Earned</p>
                    <p className="text-lg font-black text-primary mt-0.5">₹{currentUserRank.earnings}</p>
                  </div>
                </div>

                {/* Progress to next reward */}
                {(() => {
                  const currentRefs = currentUserRank.referrals;
                  // Determine next milestone
                  let nextMilestone = 5;
                  if (currentRefs >= 5 && currentRefs < 10) nextMilestone = 10;
                  else if (currentRefs >= 10 && currentRefs < 25) nextMilestone = 25;
                  else if (currentRefs >= 25 && currentRefs < 50) nextMilestone = 50;
                  else if (currentRefs >= 50 && currentRefs < 100) nextMilestone = 100;
                  else if (currentRefs >= 100) nextMilestone = currentRefs + 25; // Continuous milestone growth

                  const progressPercent = Math.min(100, Math.round((currentRefs / nextMilestone) * 100));

                  return (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-muted-foreground">Next Milestone: {nextMilestone} Referrals</span>
                        <span className="text-primary">{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium text-center">
                        {nextMilestone - currentRefs} more referral{nextMilestone - currentRefs > 1 ? "s" : ""} to reach the next milestone!
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Title Row */}
            <div className="flex items-center gap-2 px-1">
              <TrendingUp className="text-primary" size={18} strokeWidth={2.5} />
              <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Top Referral Rankings</h3>
            </div>

            {/* Scrollable Rank List */}
            {remaining.length > 0 ? (
              <div className="space-y-3 animate-fade-in">
                {remaining.map((referrer) => {
                  const avatarColor = getAvatarColor(referrer.rank);
                  return (
                    <div
                      key={referrer.userId}
                      className="flex items-center gap-4 p-4 bg-white border border-border/60 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 hover:scale-[1.01] transition-all duration-300"
                    >
                      <span className="w-6 text-center text-sm font-black text-muted-foreground">{referrer.rank}</span>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarColor} p-[2px] flex items-center justify-center text-white font-bold text-sm`}>
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
                        <span className="text-[13px] font-black text-primary">₹{referrer.earnings.toLocaleString()}</span>
                        <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Earned</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              remaining.length === 0 && sortedPodium.length > 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No additional rankings yet.</p>
              )
            )}
          </div>
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
