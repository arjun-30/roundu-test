import { Crown, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getDisplayPrice, getMembershipBadgeLabel } from "@/lib/membership";
import { MembershipBillingCycle, MembershipPlanId } from "@/types/membership";
import { formatCurrency } from "@/utils/formatCurrency";

export interface MembershipStatusCardProps {
  planId: MembershipPlanId;
  billingCycle: MembershipBillingCycle;
  missedJobs?: number;
  completedJobs?: number;
  goalJobs?: number;
}

const MembershipStatusCard = ({
  planId,
  billingCycle,
  missedJobs = 3,
  completedJobs = 2,
  goalJobs = 6,
}: MembershipStatusCardProps) => {
  const navigate = useNavigate();
  const badgeLabel = getMembershipBadgeLabel(planId);
  const amount = getDisplayPrice(planId, billingCycle);
  const safeGoal = goalJobs > 0 ? goalJobs : 1;
  const progress = Math.min(100, Math.max(0, (completedJobs / safeGoal) * 100));

  return (
    <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-[24px] p-5 shadow-[0_10px_30px_rgba(21,46,75,0.2)] overflow-hidden relative">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-xl" />
      <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-amber-400/95 text-[10px] font-black uppercase tracking-wide text-amber-950 animate-pulse shadow-[0_0_16px_rgba(251,191,36,0.55)]">
        PRO
      </span>
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <p className="text-xs uppercase tracking-widest font-black text-primary-foreground/80">
            Membership Status
          </p>
          <p className="text-xl font-black mt-1">{badgeLabel}</p>
          <p className="text-xs mt-1 text-primary-foreground/95 font-semibold">
            You're missing {missedJobs} job requests today
          </p>
          <p className="text-xs mt-0.5 text-primary-foreground/85">
            Upgrade to unlock full visibility
          </p>
          <p className="text-[11px] mt-2 text-primary-foreground/85">
            {amount !== null
              ? `${formatCurrency(amount)}/${billingCycle === "weekly" ? "week" : "month"}`
              : "Premium pricing available"}
          </p>
          <p className="text-xs mt-3 text-primary-foreground/90 font-semibold">
            {completedJobs} / {goalJobs} jobs to unlock Premium
          </p>
          <div className="mt-1.5 w-full h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
          {planId === "pro" ? <Crown size={20} /> : planId === "basic" ? <Sparkles size={20} /> : <Star size={20} />}
        </div>
      </div>
      <button
        onClick={() => navigate("/provider/membership")}
        className="mt-4 bg-white/15 hover:bg-white/20 transition-colors px-4 py-2 rounded-xl text-xs font-bold"
      >
        Unlock Premium Access
      </button>
    </div>
  );
};

export default MembershipStatusCard;
