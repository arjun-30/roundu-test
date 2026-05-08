import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Clock, Phone, Navigation, Play, CheckCircle2, Car, Calculator, IndianRupee, Timer, FileCheck, X, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getServiceById } from "@/data/mockData";
import { toast } from "sonner";
import { socket } from "@/lib/socket";

const Job = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { providerRequests, dispatch } = useApp();
  const job = providerRequests.find((r) => r.id === id);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [labourCost, setLabourCost] = useState("");
  const [partsCost, setPartsCost] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const totalQuote = (Number(labourCost) || 0) + (Number(partsCost) || 0);
  const commission = totalQuote * 0.10;
  const earnings = totalQuote - commission;

  useEffect(() => {
    let timer: NodeJS.Timeout | number;
    if (job?.status === "in_progress") {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [job?.status]);

  if (!job) {
    navigate("/provider", { replace: true });
    return null;
  }
  const service = getServiceById(job.serviceId);

  const markOnTheWay = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "on_the_way" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "on_the_way" });
    toast.success("Customer notified that you are on the way!");
    // Open Google Maps navigation to customer location
    if (job.lat && job.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`, '_blank');
    } else if (job.address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`, '_blank');
    }
  };

  const markArrived = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "arrived" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "arrived" });
    toast.success("Customer notified that you have arrived!");
  };

  const sendQuote = () => {
    if (totalQuote <= 0) {
      toast.error("Quote must be greater than zero.");
      return;
    }
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "quote_set", quote: totalQuote } });
    socket.emit("update_job_status", { bookingId: job.id, status: "quote_set", quote: totalQuote });
    setIsQuoteModalOpen(false);
    toast.success("Quote sent to customer!");
  };

  const completeJob = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "completed" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "completed" });
    // Navigate to the Service Report form
    navigate(`/provider/job/${job.id}/report`);
  };

  const renderActionBar = () => {
    switch (job.status) {
      case "accepted":
      case "assigned":
        return (
          <button
            onClick={markOnTheWay}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition-all"
          >
            <Navigation size={18} /> I'm On the Way
          </button>
        );
      case "on_the_way":
        return (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center animate-pulse">
             <span className="text-xs font-bold text-indigo-900 flex items-center justify-center gap-2">
               <Car size={16}/> Heading to Customer
             </span>
             <p className="text-[10px] text-indigo-700 mt-1">System is tracking your arrival</p>
          </div>
        );
      case "arrived":
        return (
          <div className="space-y-3">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
               <span className="text-xs font-semibold text-orange-900 flex items-center justify-center gap-1"><FileCheck size={14}/> Inspect issue to provide quote</span>
            </div>
            <button onClick={() => setIsQuoteModalOpen(true)} className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 transition-all">
              <Calculator size={18} /> Set Quote
            </button>
          </div>
        );
      case "quote_set":
        return (
          <button disabled className="w-full py-4 rounded-2xl bg-muted text-muted-foreground font-bold text-sm flex items-center justify-center gap-2 border border-border">
            <Loader2 size={18} className="animate-spin" /> Waiting for Approval...
          </button>
        );
      case "in_progress": {
        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;
        return (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
               <span className="text-xs font-semibold text-blue-900 flex items-center gap-1"><Timer size={14}/> Time Elapsed</span>
               <span className="text-lg font-bold text-blue-700 font-mono">{mins.toString().padStart(2,'0')}:{secs.toString().padStart(2,'0')}</span>
            </div>
            <button onClick={completeJob} className="w-full py-4 rounded-2xl bg-success text-success-foreground font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-success/30 transition-all">
              <CheckCircle2 size={18} /> Complete Job
            </button>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/provider")} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Active Job</h1>
      </div>

      <div className="px-5 flex-1 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {job.customerName.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-foreground">{job.customerName}</p>
              <p className="text-xs text-muted-foreground">{service?.label}</p>
            </div>
            <button className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Phone size={16} className="text-primary-foreground" />
            </button>
          </div>

          <div className="h-px bg-border my-4" />
          <Row icon={MapPin} text={job.address} />
          <Row icon={Calendar} text={job.date} />
          <Row icon={Clock} text={job.time} />
          {job.notes && (
            <>
              <div className="h-px bg-border my-3" />
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Notes</p>
              <p className="text-xs text-foreground">{job.notes}</p>
            </>
          )}
        </div>

        <button
          onClick={() => {
            if (job.lat && job.lng) {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`, '_blank');
            } else if (job.address) {
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`, '_blank');
            } else {
              toast.error("No address available for navigation");
            }
          }}
          className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Navigation size={18} className="text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-foreground">Open Navigation</p>
            <p className="text-[10px] text-muted-foreground">Get directions to customer</p>
          </div>
        </button>

        <div className="bg-input border border-border rounded-2xl p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Earnings</p>
          <p className="text-2xl font-extrabold text-primary mt-0.5">₹{job.quote || job.price}</p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 bg-card border-t border-border z-10">
        {renderActionBar()}
      </div>

      {/* Quote Modal */}
      {isQuoteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-card border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calculator size={18} className="text-primary"/> Set Quote
              </h2>
              <button onClick={() => setIsQuoteModalOpen(false)} className="p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Labour Charges</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee size={16} className="text-muted-foreground" />
                  </div>
                  <input
                    type="number"
                    value={labourCost}
                    onChange={(e) => setLabourCost(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-input border border-border text-foreground text-lg font-bold focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Spare Parts (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee size={16} className="text-muted-foreground" />
                  </div>
                  <input
                    type="number"
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-input border border-border text-foreground text-lg font-bold focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 border border-border/50 space-y-2 mt-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Total Customer Pays</span>
                   <span className="font-bold text-foreground">₹{totalQuote.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Platform Fee (10%)</span>
                   <span className="font-bold text-destructive">-₹{commission.toFixed(2)}</span>
                 </div>
                 <div className="h-px bg-border my-1" />
                 <div className="flex justify-between text-base">
                   <span className="font-bold text-foreground">Your Earnings</span>
                   <span className="font-extrabold text-success">₹{earnings.toFixed(2)}</span>
                 </div>
              </div>
            </div>

            <div className="p-5 pt-0 border-t border-border mt-2 bg-muted/10">
              <button
                onClick={sendQuote}
                disabled={totalQuote <= 0}
                className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center mt-4"
              >
                Send Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Row = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-2 py-1">
    <Icon size={14} className="text-primary" />
    <span className="text-xs text-foreground">{text}</span>
  </div>
);

export default Job;