import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Calendar, Clock, Phone, Navigation, Play, CheckCircle2, Car, Timer, Loader2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getServiceById } from "@/data/mockData";
import { toast } from "sonner";
import { socket } from "@/lib/socket";

const Job = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { providerRequests, dispatch } = useApp();
  const job = providerRequests.find((r) => r.id === id);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false); // kept for future use
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | number;
    if (job?.status === "in_progress") {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [job?.status]);

  // Don't redirect immediately — state from ADD_REQUEST may not have propagated yet.
  // Wait up to 3 seconds before giving up and going back to dashboard.
  const [notFoundTimer, setNotFoundTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!job) {
      const t = setTimeout(() => {
        navigate("/provider", { replace: true });
      }, 3000);
      setNotFoundTimer(t);
      return () => clearTimeout(t);
    } else {
      // Job found — cancel any pending redirect
      if (notFoundTimer) clearTimeout(notFoundTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, navigate]);

  if (!job) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading job details...</p>
      </div>
    );
  }
  const service = getServiceById(job.serviceId);

  const markOnTheWay = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "on_the_way" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "on_the_way" });
    toast.success("Customer notified that you are on the way!");
  };

  const markArrived = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "arrived" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "arrived" });
    toast.success("Customer notified that you have arrived!");
  };

  const startService = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "in_progress" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "in_progress" });
    toast.success("Service started! Customer has been notified.");
  };

  const completeJob = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "completed" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "completed" });
    navigate(`/provider/job/${job.id}/report`);
  };

  const openNavigation = () => {
    const destination = (job.lat && job.lng) 
      ? `${job.lat},${job.lng}` 
      : encodeURIComponent(job.address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, "_blank");
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
          <div className="space-y-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
               <span className="text-xs font-bold text-indigo-900 flex items-center justify-center gap-2">
                 <Car size={16}/> Heading to Customer
               </span>
               <p className="text-[10px] text-indigo-700 mt-1">Status updates automatically when you arrive within 100m</p>
            </div>
            <button
              onClick={openNavigation}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Navigation size={16} /> Open Navigation
            </button>
            <button
              onClick={() => {
                dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "arrived" } });
                socket.emit("update_job_status", { bookingId: job.id, status: "arrived" });
                toast.success("Marked as arrived!");
              }}
              className="w-full py-3 rounded-2xl bg-orange-500 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <MapPin size={16} /> Mark as Arrived (Manual)
            </button>
          </div>
        );
      case "arrived":
        return (
          <button
            onClick={startService}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
          >
            <Play size={18} /> Start Service
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
            <button
              onClick={openNavigation}
              className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Navigation size={16} /> Open Navigation
            </button>
            <button onClick={completeJob} className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-sm active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-green-600/30 transition-all">
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
          onClick={openNavigation}
          className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Navigation size={18} className="text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-foreground">Open Navigation</p>
            <p className="text-[10px] text-muted-foreground">{job.lat ? "GPS coordinates ready" : job.address}</p>
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