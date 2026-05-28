import { Check, Crown } from "lucide-react";
import { MembershipBillingCycle, MembershipPlan, MembershipPlanId } from "@/types/membership";

interface MembershipPlanCardProps {
  plan: MembershipPlan;
  billingCycle: MembershipBillingCycle;
  isActive: boolean;
  onSelect: (planId: MembershipPlanId) => void;
}

const MembershipPlanCard = ({ plan, billingCycle, isActive, onSelect }: MembershipPlanCardProps) => {
  const amount = billingCycle === "weekly" ? plan.weeklyPrice : plan.monthlyPrice;
  const period = billingCycle === "weekly" ? "week" : "month";

  return (
    <div
      className={`rounded-[24px] border-2 p-5 transition-all shadow-sm ${
        isActive
          ? "border-primary bg-primary/5 shadow-[0_8px_24px_rgba(21,46,75,0.12)]"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-foreground">{plan.name}</h3>
            {plan.tagline && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-accent text-white uppercase font-black tracking-wider">
                {plan.tagline}
              </span>
            )}
          </div>
          <p className="text-2xl font-black mt-3 text-foreground">₹{amount}</p>
          <p className="text-xs text-muted-foreground">per {period}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.highlight ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"}`}>
          <Crown size={18} />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-start gap-2">
            <Check size={14} className="text-emerald-600 mt-0.5" />
            <p className="text-sm text-foreground">{feature}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSelect(plan.id)}
        className={`w-full mt-5 py-3 rounded-xl text-sm font-bold transition-colors ${
          isActive
            ? "bg-primary text-primary-foreground"
            : "bg-muted hover:bg-muted/80 text-foreground"
        }`}
      >
        {isActive ? "Current Plan" : `Choose ${plan.name}`}
      </button>
    </div>
  );
};

export default MembershipPlanCard;
