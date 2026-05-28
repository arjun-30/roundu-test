import { ArrowLeft, Sparkles, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MembershipComparisonTable from "@/components/provider/MembershipComparisonTable";
import MembershipPlanCard from "@/components/provider/MembershipPlanCard";
import ProviderBottomNav from "@/components/ProviderBottomNav";
import { useApp } from "@/context/AppContext";
import { MEMBERSHIP_PLANS, getMembershipBadgeLabel } from "@/lib/membership";
import { MembershipBillingCycle, MembershipPlanId } from "@/types/membership";

const Membership = () => {
  const navigate = useNavigate();
  const { membership, dispatch } = useApp();
  const [billingCycle, setBillingCycle] = useState<MembershipBillingCycle>(membership.billingCycle);

  const activePlanId = membership.planId;
  const summaryText = useMemo(() => {
    if (activePlanId === "free") return "Start with a paid plan to improve reach and visibility.";
    return `You are currently on ${getMembershipBadgeLabel(activePlanId)}.`;
  }, [activePlanId]);

  const updateMembership = (planId: MembershipPlanId) => {
    dispatch({
      type: "SET_MEMBERSHIP",
      membership: {
        planId,
        billingCycle,
        startedAt: planId === "free" ? null : new Date().toISOString(),
      },
    });
  };

  const onBillingCycleChange = (next: MembershipBillingCycle) => {
    setBillingCycle(next);
    dispatch({
      type: "SET_MEMBERSHIP",
      membership: {
        ...membership,
        billingCycle: next,
      },
    });
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      <div className="px-5 pt-3 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate("/provider")}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Membership</h1>
      </div>

      <div className="px-5 flex-1 space-y-5">
        <div className="rounded-[24px] p-5 text-white bg-gradient-to-br from-[#0f4c81] via-[#1b5f99] to-[#123b62] relative overflow-hidden shadow-[0_12px_34px_rgba(17,52,86,0.35)]">
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/15 blur-xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-white/80">
              <Sparkles size={14} />
              <p className="text-xs uppercase tracking-wider font-bold">Provider Growth</p>
            </div>
            <h2 className="text-[22px] font-black mt-3 leading-tight">Grow Your Business with RoundU</h2>
            <p className="text-sm text-white/90 mt-2">{summaryText}</p>
            <div className="inline-flex items-center gap-1 mt-4 px-3 py-1.5 rounded-full bg-white/20 text-xs font-bold">
              <Star size={12} />
              {getMembershipBadgeLabel(activePlanId)}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-2 flex items-center gap-2">
          <button
            onClick={() => onBillingCycleChange("weekly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              billingCycle === "weekly" ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => onBillingCycleChange("monthly")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              billingCycle === "monthly" ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            Monthly
          </button>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-black uppercase tracking-wider">
            Save 15%
          </span>
        </div>

        <div className="space-y-4">
          {MEMBERSHIP_PLANS.map((plan) => (
            <MembershipPlanCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              isActive={activePlanId === plan.id}
              onSelect={updateMembership}
            />
          ))}
          {activePlanId !== "free" && (
            <button
              onClick={() => updateMembership("free")}
              className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Downgrade to Free Provider
            </button>
          )}
        </div>

        <div className="space-y-3 pb-6">
          <h3 className="text-base font-black text-foreground">Plan Comparison</h3>
          <MembershipComparisonTable />
        </div>
      </div>

      <ProviderBottomNav />
    </div>
  );
};

export default Membership;
