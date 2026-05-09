import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Info, ChevronDown, CheckCircle2 } from "lucide-react";


const Cancellation = () => {
  const navigate = useNavigate();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  const refundSlabs = [
    { label: "48h+", refund: "100%", status: "available" },
    { label: "24h", refund: "75%", status: "available" },
    { label: "12h", refund: "50%", status: "locked" },
    { label: "6h", refund: "25%", status: "locked" },
    { label: "3h", refund: "10%", status: "locked" },
    { label: "<3h", refund: "0%", status: "locked" },
  ];

  const handleConfirm = () => {
    if (!reason) {
      setError("Please select a reason");
      return;
    }
    setError("");
    setConfirmed(true);
    setTimeout(() => {
      navigate("/home", { replace: true });
    }, 2000);
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-10 relative overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Cancel Booking</h1>
      </div>

      <div className="flex-1 px-6 space-y-8 relative z-10 pt-4 overflow-y-auto">
        {/* Refund Breakdown */}
        <div className="bg-card border border-border rounded-[32px] p-6 space-y-6 shadow-sm animate-scale-in">
           <div className="flex items-center justify-between">
              <div>
                 <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Refund Amount</p>
                 <h2 className="text-3xl font-extrabold text-foreground mt-1">₹375.00</h2>
              </div>
              <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                 75% Refund
              </div>
           </div>

           <div className="h-px bg-border" />

           {/* Slabs IRCTC style */}
           <div className="space-y-4">
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">Cancellation Policy (IRCTC Style)</p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
                 {refundSlabs.map((slab, i) => (
                    <div 
                       key={i}
                       className={`flex-shrink-0 min-w-[70px] p-3 rounded-2xl flex flex-col items-center gap-1 border-2 transition-all
                          ${slab.status === "available" ? "border-primary bg-primary/5 shadow-md shadow-primary/5" : "border-input bg-input/50 text-muted-foreground opacity-50"}
                          ${slab.label === "24h" ? "ring-2 ring-primary ring-offset-2" : ""}
                       `}
                    >
                       <p className="text-[10px] font-black">{slab.label}</p>
                       <p className="text-xs font-bold">{slab.refund}</p>
                       {slab.status === "available" && <CheckCircle2 size={12} className="text-primary mt-1" />}
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Reason Selection */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
           <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest pl-1">Why are you cancelling?</p>
           <div className="relative">
              <select 
                 value={reason} 
                 onChange={(e) => setReason(e.target.value)}
                 className="w-full pl-4 pr-10 py-4 rounded-2xl bg-input border border-border text-sm text-foreground font-bold appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                 <option value="" disabled>Select a reason</option>
                 <option value="change_of_plans">Change of plans</option>
                 <option value="wrong_service">Booked the wrong service</option>
                 <option value="found_better">Found a better professional</option>
                 <option value="provider_issue">Provider is unresponsive</option>
                 <option value="emergency">Emergency / Other</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
           </div>
           {error && <p className="text-red-500 text-xs mt-1 ml-1">{error}</p>}
        </div>

        {/* Warning card */}
        <div className="bg-destructive/5 rounded-3xl p-5 border border-destructive/10 flex gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
           <AlertCircle className="text-destructive mt-0.5" size={20} />
           <div className="space-y-1">
              <p className="text-sm font-bold text-destructive">Wait!</p>
              <p className="text-xs text-destructive/70 italic leading-relaxed">
                 You are cancelling within 24 hours. A cancellation fee of ₹125 will be deducted from your booking amount.
              </p>
           </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1 animate-fade-in" style={{ animationDelay: "0.4s" }}>
           <Info size={12} />
           <p>The refund will be credited to your Roundu Wallet instantly.</p>
        </div>
      </div>

      {/* Action Button */}
      <div className="px-6 pt-4 relative z-10">
        <button
          onClick={handleConfirm}
          className="w-full py-4 rounded-2xl bg-destructive text-destructive-foreground font-extrabold text-lg shadow-2xl shadow-destructive/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
        >
          Confirm Cancellation
        </button>
      </div>

      {/* Confirmed Overlay */}
      {confirmed && (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center text-center px-10">
           <div className="space-y-6 animate-scale-in">
             <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
               <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white">
                 <CheckCircle2 size={32} strokeWidth={3} />
               </div>
             </div>
             <div>
               <h2 className="text-2xl font-extrabold text-foreground">Cancelled</h2>
               <p className="text-sm text-muted-foreground mt-2">₹375 has been credited to your wallet.</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Cancellation;
