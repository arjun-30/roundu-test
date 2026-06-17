import { useApp } from "@/context/AppContext";
import { XCircle } from "lucide-react";

const GlobalCancellationPopup = () => {
  const { cancelledJobsQueue, dispatch } = useApp() as any;
  
  if (!cancelledJobsQueue || cancelledJobsQueue.length === 0) return null;
  
  const job = cancelledJobsQueue[0];
  
  const handleDismiss = () => {
    dispatch({ type: "DISMISS_CANCELLED_JOB" });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border animate-in zoom-in-95 duration-300">
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <XCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Job Cancelled</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The customer has cancelled the request.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleDismiss}
              className="w-full py-3.5 rounded-2xl bg-input text-foreground font-bold text-sm hover:bg-muted active:scale-[0.98]"
            >
              Okay
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalCancellationPopup;
