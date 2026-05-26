import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, Plus, ShieldCheck } from "lucide-react";

const PaymentCancelled = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col bg-background relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-4 relative z-10">
        <button
          onClick={() => navigate("/wallet")}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground tracking-tight">Payment Status</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10 -mt-10">
        {/* Animated Icon */}
        <div className="relative mb-8 animate-scale-in">
          <div className="w-32 h-32 rounded-full bg-red-500/10 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-red-500/15 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl shadow-red-500/30">
                <XCircle className="text-white" size={32} strokeWidth={2.5} />
              </div>
            </div>
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 w-32 h-32 rounded-full border-2 border-red-500/20 animate-ping" style={{ animationDuration: "2s" }} />
        </div>

        {/* Status Text */}
        <div className="text-center space-y-3 mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Payment Cancelled</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
            Your payment was not completed. No amount has been deducted from your account.
          </p>
        </div>

        {/* Info Card */}
        <div
          className="w-full bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-5 border border-amber-200 dark:border-amber-500/20 mb-8 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="text-amber-600 dark:text-amber-400" size={18} />
            </div>
            <div>
              <p className="text-[13px] font-bold text-amber-800 dark:text-amber-300">No charges applied</p>
              <p className="text-[11px] text-amber-700/70 dark:text-amber-400/60 mt-1 leading-relaxed">
                If any amount was debited, it will be refunded within 5-7 business days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="px-6 pb-10 space-y-3 relative z-10 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <button
          onClick={() => navigate("/wallet/topup", { replace: true })}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-extrabold text-base shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 h-14"
        >
          <Plus size={20} strokeWidth={3} /> Add Money to Wallet
        </button>
        <button
          onClick={() => navigate("/wallet", { replace: true })}
          className="w-full py-4 rounded-2xl bg-card border border-border text-foreground font-bold text-sm active:scale-[0.98] transition-all h-14"
        >
          Back to Wallet
        </button>
      </div>
    </div>
  );
};

export default PaymentCancelled;
