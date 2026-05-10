import { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Star, X } from "lucide-react";

interface PIPModalProps {
  type: "new_signup" | "low_rating";
  rating?: number;
  onCommit: () => void;
  onClose?: () => void;
}

const PIPModal = ({ type, rating, onCommit, onClose }: PIPModalProps) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-background/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        
        {type === "low_rating" && onClose && (
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        )}

        <div className={`p-6 flex flex-col items-center text-center ${type === "new_signup" ? "bg-primary" : "bg-destructive"}`}>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 border border-white/30 animate-pulse">
            {type === "new_signup" ? <Star size={32} className="text-white fill-white" /> : <ShieldAlert size={32} className="text-white" />}
          </div>
          <h2 className="text-xl font-extrabold text-white">
            {type === "new_signup" ? "Welcome to RoundU!" : "Performance Alert"}
          </h2>
          <p className="text-sm text-white/80 mt-1">
            {type === "new_signup" ? "Maintaining high standards" : "Your account is at risk of deactivation"}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-muted rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed font-medium">
              {type === "new_signup" ? (
                "Please note that if your review score reduces below 3.5, you will get fewer bookings than other top-rated professionals."
              ) : (
                `Your current rating is ${rating}. Because your rating has dropped below 3.5, you must improve your service quality immediately, or your account may be temporarily deactivated.`
              )}
            </p>
          </div>

          <label className="flex items-start gap-3 mt-4 cursor-pointer group">
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors ${isChecked ? 'bg-primary border-primary' : 'border-muted-foreground group-hover:border-primary'}`}>
              {isChecked && <CheckCircle2 size={16} className="text-primary-foreground" />}
            </div>
            <span className="text-sm font-semibold text-foreground select-none">
              I commit to work hard and maintain my rating and trust score.
            </span>
          </label>
        </div>

        <div className="p-4 pt-0 border-t border-border bg-muted/20">
          <button
            onClick={onCommit}
            disabled={!isChecked}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 mt-4 ${
              isChecked 
                ? (type === "new_signup" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98]" : "bg-destructive text-white shadow-lg shadow-destructive/20 active:scale-[0.98]") 
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {type === "new_signup" ? "Let's Start" : "I Commit to Improve"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PIPModal;
