export type MembershipPlanId = "free" | "basic" | "pro";

export type MembershipBillingCycle = "weekly" | "monthly";

export interface MembershipPlan {
  id: Exclude<MembershipPlanId, "free">;
  name: string;
  tagline?: string;
  weeklyPrice: number;
  monthlyPrice: number;
  features: string[];
  highlight?: boolean;
}

export interface MembershipSelection {
  planId: MembershipPlanId;
  billingCycle: MembershipBillingCycle;
  startedAt: string | null;
}
