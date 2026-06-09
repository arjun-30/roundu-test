import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, History, CreditCard, Wallet as WalletIcon } from "lucide-react";
import { useApp } from "@/context/AppContext";

const Wallet = () => {
  const navigate = useNavigate();
  const { walletBalance } = useApp();

  const transactions = [
    { id: 1, type: "credit", label: "Added to Wallet", amount: 500, date: "Today, 10:30 AM" },
    { id: 2, type: "debit", label: "Booking: Electrician", amount: 299, date: "Yesterday, 4:15 PM" },
    { id: 3, type: "credit", label: "Cashback Received", amount: 25, date: "20 Apr, 11:20 AM" },
  ];

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Your Wallet</h1>
      </div>

      <div className="px-6 flex-1 space-y-6">
        {/* Balance Card - Ultra Premium */}
        <div className="relative h-48 rounded-[32px] bg-gradient-to-br from-[#152E4B] via-[#1C3D63] to-[#244D7C] p-7 overflow-hidden shadow-2xl shadow-primary/30 animate-scale-in">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/60 text-[10px] font-extrabold uppercase tracking-widest">Available Balance</p>
                <h2 className="text-4xl font-extrabold text-white mt-1 tracking-tight">₹{walletBalance.toLocaleString()}</h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <WalletIcon className="text-white" size={24} />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/wallet/topup")}
                className="flex-1 py-3 rounded-2xl bg-white text-primary font-extrabold text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              >
                <Plus size={16} strokeWidth={3} /> Add Money
              </button>
              <button className="w-14 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center active:scale-[0.97] transition-all">
                <CreditCard className="text-white" size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions removed per customer request */}

        {/* Transactions list */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <History size={18} className="text-primary" /> Recent Transactions
            </h3>
            <button
              onClick={() => navigate("/wallet/history")}
              className="text-xs font-bold text-primary"
            >
              See All
            </button>
          </div>

          <div className="space-y-3">
            {transactions.map((tx, idx) => (
              <div 
                key={tx.id} 
                className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between hover:bg-input transition-colors group animate-fade-in-up"
                style={{ animationDelay: `${0.3 + (idx * 0.1)}s`, opacity: 0 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === "credit" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                    {tx.type === "credit" ? <TrendingUp size={18} className="text-green-500" /> : <TrendingDown size={18} className="text-red-500" />}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{tx.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{tx.date}</p>
                  </div>
                </div>
                <p className={`text-sm font-extrabold ${tx.type === "credit" ? "text-green-500" : "text-foreground"}`}>
                  {tx.type === "credit" ? "+" : "-"} ₹{tx.amount}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
