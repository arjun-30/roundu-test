import {
  MembershipBillingCycle,
  MembershipPlan,
  MembershipPlanId,
  MembershipSelection,
} from "@/types/membership";

const STORAGE_KEY = "roundu_provider_membership";

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "basic",
    name: "Basic",
    weeklyPrice: 29,
    monthlyPrice: 99,
    features: [
      "Verified Badge",
      "Better Profile Visibility",
      "Profile Completion Score",
      "Priority Support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Most Popular",
    weeklyPrice: 59,
    monthlyPrice: 199,
    highlight: true,
    features: [
      "Everything in Basic",
      "Higher Search Ranking",
      "Featured Local Placement",
      "Booking Analytics",
      "Customer Insights",
      "Priority Lead Notifications",
    ],
  },
];

export const DEFAULT_MEMBERSHIP: MembershipSelection = {
  planId: "free",
  billingCycle: "monthly",
  startedAt: null,
};

export const getMembershipBadgeLabel = (planId: MembershipPlanId): string => {
  if (planId === "basic") return "Basic Member";
  if (planId === "pro") return "Pro Member";
  return "Free Provider";
};

export const getPlanById = (planId: MembershipPlanId) =>
  MEMBERSHIP_PLANS.find((plan) => plan.id === planId);

export const getDisplayPrice = (
  planId: MembershipPlanId,
  billingCycle: MembershipBillingCycle
): number | null => {
  const plan = getPlanById(planId);
  if (!plan) return null;
  return billingCycle === "weekly" ? plan.weeklyPrice : plan.monthlyPrice;
};

export const parseStoredMembership = (
  raw: string | null
): MembershipSelection => {
  if (!raw) return DEFAULT_MEMBERSHIP;
  try {
    const parsed = JSON.parse(raw) as MembershipSelection;
    const billingCycle: MembershipBillingCycle =
      parsed.billingCycle === "weekly" ? "weekly" : "monthly";
    const validPlan: MembershipPlanId =
      parsed.planId === "basic" || parsed.planId === "pro" ? parsed.planId : "free";
    return {
      planId: validPlan,
      billingCycle,
      startedAt: parsed.startedAt ?? null,
    };
  } catch {
    return DEFAULT_MEMBERSHIP;
  }
};

export const getStoredMembership = (): MembershipSelection =>
  parseStoredMembership(localStorage.getItem(STORAGE_KEY));

export const setStoredMembership = (selection: MembershipSelection): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
};

/**
 * Single gateway for membership persistence.
 * Replace internals with backend calls later without touching screens.
 */
export const membershipGateway = {
  async getMembership(): Promise<MembershipSelection> {
    return getStoredMembership();
  },
  async saveMembership(selection: MembershipSelection): Promise<MembershipSelection> {
    setStoredMembership(selection);
    return selection;
  },
};
