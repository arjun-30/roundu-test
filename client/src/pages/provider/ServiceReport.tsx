import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Camera, Upload, AlertTriangle, FileText, Activity, Wrench } from "lucide-react";
import { useApp } from "@/context/AppContext";

const ServiceReport = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { providerRequests, dispatch } = useApp();
  
  const job = providerRequests.find((r) => r.id === id);

  const [rootCause, setRootCause] = useState("");
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState("");
  const [requiresFollowUp, setRequiresFollowUp] = useState(false);
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
  const [notification, setNotification] = useState("");
  const [error, setError] = useState("");

  if (!job) {
    navigate("/provider", { replace: true });
    return null;
  }

  const handleSimulateUpload = (setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    setNotification("Uploading photo...");
    setTimeout(() => {
      setter("https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop");
      setNotification("Photo uploaded successfully");
      setTimeout(() => setNotification(""), 3000);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.length < 20) {
      setError("Description must be at least 20 characters long.");
      setTimeout(() => setError(""), 3000);
      return;
    }
    
    dispatch({ type: "COMPLETE_REQUEST", id: job.id });
    setNotification(`Job completed! ₹${job.quote || job.price} added to your earnings.`);
    setTimeout(() => navigate("/provider/dashboard", { replace: true }), 1500);
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-28 animate-in slide-in-from-right-8">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-white sticky top-0 z-10 border-b border-border shadow-sm">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">Service Report</h1>
          <p className="text-xs text-muted-foreground">Mandatory for final payment</p>
        </div>
      </div>

      <div className="p-5 flex-1">
        {notification && <div className="mb-4 bg-blue-50 text-blue-700 p-3 rounded-xl text-sm font-semibold">{notification}</div>}
        {error && <div className="mb-4 bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Root Cause */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Wrench size={14} className="text-primary"/> Root Cause
            </label>
            <select
              required
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              className="w-full p-4 rounded-2xl bg-input border border-border text-foreground text-sm font-semibold focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
            >
              <option value="" disabled>Select the primary issue</option>
              <option value="wear_tear">Normal Wear & Tear</option>
              <option value="damage">Accidental Damage</option>
              <option value="installation">Improper Installation</option>
              <option value="electrical">Electrical Fault</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Severity Slider */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={14} className="text-warning"/> Issue Severity
              </label>
              <span className="text-sm font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">{severity}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-warning h-2 bg-muted rounded-full appearance-none"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold px-1">
              <span>Minor</span>
              <span>Severe</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-primary"/> Work Done
              </label>
              <span className={`text-[10px] font-bold ${description.length < 20 ? 'text-destructive' : 'text-success'}`}>
                {description.length}/20 min
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what was fixed, parts replaced, and any tests performed..."
              className="w-full p-4 rounded-2xl bg-input border border-border text-foreground text-sm resize-none focus:ring-2 focus:ring-primary focus:outline-none placeholder:text-muted-foreground/60"
            />
          </div>

          {/* Photos */}
          <div className="space-y-3">
             <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={14} className="text-primary"/> Proof of Work
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => handleSimulateUpload(setBeforePhoto)}
                className="aspect-square rounded-2xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-input transition-colors relative overflow-hidden"
              >
                {beforePhoto ? (
                  <>
                    <img src={beforePhoto} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold py-1 px-2 rounded-md text-center">Before</div>
                  </>
                ) : (
                  <>
                    <Upload size={20} className="text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">Before Photo</span>
                  </>
                )}
              </div>
              <div 
                onClick={() => handleSimulateUpload(setAfterPhoto)}
                className="aspect-square rounded-2xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-input transition-colors relative overflow-hidden"
              >
                {afterPhoto ? (
                  <>
                    <img src={afterPhoto} alt="After" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold py-1 px-2 rounded-md text-center">After</div>
                  </>
                ) : (
                  <>
                    <Upload size={20} className="text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">After Photo</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Follow-up */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-orange-900 flex items-center gap-1.5">
                <AlertTriangle size={16} /> Follow-up Required?
              </p>
              <p className="text-[10px] text-orange-700 mt-0.5">Does this job need a second visit?</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={requiresFollowUp} onChange={(e) => setRequiresFollowUp(e.target.checked)} />
              <div className="w-11 h-6 bg-orange-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500 shadow-inner"></div>
            </label>
          </div>

        </form>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-border shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <button
          onClick={handleSubmit}
          disabled={description.length < 20 || !rootCause}
          className="w-full py-4 rounded-2xl bg-success text-success-foreground font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 shadow-lg shadow-success/30"
        >
          <CheckCircle2 size={18} /> Submit Report & Get Paid
        </button>
      </div>
    </div>
  );
};

export default ServiceReport;
