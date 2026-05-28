import { Check, Minus } from "lucide-react";

const rows = [
  { feature: "Verified Badge", basic: true, pro: true },
  { feature: "Better Profile Visibility", basic: true, pro: true },
  { feature: "Profile Completion Score", basic: true, pro: true },
  { feature: "Priority Support", basic: true, pro: true },
  { feature: "Higher Search Ranking", basic: false, pro: true },
  { feature: "Featured Local Placement", basic: false, pro: true },
  { feature: "Booking Analytics", basic: false, pro: true },
  { feature: "Customer Insights", basic: false, pro: true },
  { feature: "Priority Lead Notifications", basic: false, pro: true },
];

const MembershipComparisonTable = () => {
  return (
    <div className="bg-card border border-border rounded-[24px] overflow-hidden shadow-sm">
      <div className="grid grid-cols-3 bg-muted/50 px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
        <p>Features</p>
        <p className="text-center">Basic</p>
        <p className="text-center">Pro</p>
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.feature}
          className={`grid grid-cols-3 items-center px-4 py-3 ${idx !== rows.length - 1 ? "border-b border-border" : ""}`}
        >
          <p className="text-sm text-foreground">{row.feature}</p>
          <div className="flex justify-center">
            {row.basic ? <Check size={16} className="text-emerald-600" /> : <Minus size={16} className="text-muted-foreground" />}
          </div>
          <div className="flex justify-center">
            {row.pro ? <Check size={16} className="text-emerald-600" /> : <Minus size={16} className="text-muted-foreground" />}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MembershipComparisonTable;
