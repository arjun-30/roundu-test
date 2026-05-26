import { useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, TrendingUp, TrendingDown, Search, Calendar } from "lucide-react";

const WalletHistory = () => {
  const navigate = useNavigate();

  const transactions = [
    { id: 1, type: "credit", label: "Top-up via UPI", amount: 1000, date: "22 Apr 2026", time: "10:30 AM", status: "Success" },
    { id: 2, type: "debit", label: "Paid for Plumber Service", amount: 450, date: "21 Apr 2026", time: "02:15 PM", status: "Success" },
    { id: 3, type: "credit", label: "Referral Bonus", amount: 100, date: "20 Apr 2026", time: "11:00 AM", status: "Success" },
    { id: 4, type: "debit", label: "Subscription: Home Care", amount: 299, date: "15 Apr 2026", time: "09:45 AM", status: "Success" },
    { id: 5, type: "credit", label: "Refund: Cancelled Trip", amount: 500, date: "12 Apr 2026", time: "05:20 PM", status: "Success" },
    { id: 6, type: "debit", label: "Service Tip: Rajesh", amount: 50, date: "10 Apr 2026", time: "06:10 PM", status: "Success" },
    { id: 7, type: "credit", label: "Top-up via Card", amount: 2000, date: "05 Apr 2026", time: "12:00 PM", status: "Success" },
  ];

  return (
    <div className="min-h-full flex flex-col bg-background pb-10">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">History</h1>
        </div>
        <button className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground">
          <Filter size={18} />
        </button>
      </div>

      <div className="px-6 space-y-6">
        {/* Search */}
        <div className="relative animate-fade-in">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search by service or ID..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-input border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
          />
        </div>

        {/* List by Months Placeholder */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14} />
              <span className="text-[10px] font-extrabold uppercase tracking-widest">April 2026</span>
            </div>

            <div className="space-y-3">
              {transactions.map((tx, idx) => (
                <div
                  key={tx.id}
                  className="bg-card border border-border p-4 rounded-3xl flex items-center justify-between animate-fade-in-up"
                  style={{ animationDelay: `${idx * 0.1}s`, opacity: 0 }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tx.type === "credit" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      {tx.type === "credit" ? <TrendingUp size={22} className="text-green-500" /> : <TrendingDown size={22} className="text-red-500" />}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-foreground">{tx.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{tx.date} • {tx.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[15px] font-extrabold ${tx.type === "credit" ? "text-green-500" : "text-foreground"}`}>
                      {tx.type === "credit" ? "+" : "-"}₹{tx.amount}
                    </p>
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletHistory;
