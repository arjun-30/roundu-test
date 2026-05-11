import { ArrowLeft, Crown, Calendar, Settings2, PauseCircle, PlayCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const ManageSubscriptions = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [notification, setNotification] = useState("");

  const handleAction = (action: string) => {
    if (action === "pause") {
      setStatus("paused");
      setNotification("Subscription paused successfully.");
    } else if (action === "resume") {
      setStatus("active");
      setNotification("Subscription resumed successfully.");
    } else if (action === "cancel") {
      setNotification("Subscription cancelled. You will have access until the end of billing cycle.");
    }
    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24 font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-background flex items-center justify-center mr-3 hover:bg-gray-100 active:scale-95 transition-all">
          <ArrowLeft size={20} className="text-primary" />
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Manage Plan</h1>
      </div>

      <div className="px-5 pt-6 space-y-5">
        {notification && (
          <div className="bg-secondary/10 text-blue-700 p-3 rounded-xl text-sm font-semibold mb-4 text-center">
            {notification}
          </div>
        )}
        <div className="bg-white rounded-[20px] p-6 border-[2px] border-blue-500 shadow-[0_8px_30px_rgba(59,130,246,0.12)] relative">
          <div className={`absolute top-5 right-5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-md ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {status}
          </div>

          <div className="flex flex-col mb-5 pt-1">
             <div className="w-14 h-14 rounded-2xl bg-secondary/10 border border-blue-100 flex items-center justify-center mb-4 shadow-sm">
                <Crown size={28} className="text-secondary" fill="currentColor" />
             </div>
             <h2 className="text-[19px] font-extrabold text-foreground">Pro Plan</h2>
             <p className="text-[14px] font-bold text-muted-foreground mt-1">₹1,999 / month</p>
          </div>

          <div className="bg-background rounded-xl p-5 mb-5 border border-border space-y-4">
             <div>
               <div className="flex items-center gap-3 mb-1.5">
                  <Calendar size={16} className="text-secondary" />
                  <p className="text-[13px] font-bold text-foreground">Next Service Date</p>
               </div>
               <p className="text-[13px] font-semibold text-muted-foreground ml-7">Oct 24, 2026</p>
             </div>
             
             <div className="h-px bg-gray-200 w-full" />
             
             <div>
               <div className="flex items-center gap-3 mb-1.5">
                  <Settings2 size={16} className="text-secondary" />
                  <p className="text-[13px] font-bold text-foreground">Services Remaining</p>
               </div>
               <p className="text-[13px] font-semibold text-muted-foreground ml-7">4 Services this month</p>
             </div>
          </div>

          <div className="space-y-3 mt-6">
            {status === "active" ? (
              <button 
                onClick={() => handleAction("pause")}
                className="w-full py-4 rounded-xl bg-orange-50 text-orange-600 font-bold text-[14.5px] flex items-center justify-center gap-2 hover:bg-orange-100 active:scale-[0.98] transition-all"
              >
                <PauseCircle size={18} />
                Pause Subscription
              </button>
            ) : (
              <button 
                onClick={() => handleAction("resume")}
                className="w-full py-4 rounded-xl bg-green-50 text-green-600 font-bold text-[14.5px] flex items-center justify-center gap-2 hover:bg-green-100 active:scale-[0.98] transition-all"
              >
                <PlayCircle size={18} />
                Resume Subscription
              </button>
            )}
            
            <button 
              onClick={() => handleAction("cancel")}
              className="w-full py-4 rounded-xl bg-white border border-red-100 text-red-500 font-bold text-[14.5px] flex items-center justify-center gap-2 hover:bg-red-50 active:scale-[0.98] transition-all"
            >
              <XCircle size={18} />
              Cancel Subscription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ManageSubscriptions;
