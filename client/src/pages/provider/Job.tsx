import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Calendar, Clock, Phone, Navigation, Play, CheckCircle2, Car, Timer, Loader2, MessageCircle, Mic } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getServiceById } from "@/data/mockData";
import { socket } from "@/lib/socket";

const Job = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id = "" } = useParams();
  const { providerRequests, dispatch } = useApp();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (location.state?.from === "profile") {
      navigate("/provider/profile");
    } else if (location.state?.from === "jobs") {
      navigate("/provider/jobs");
    } else {
      navigate("/provider");
    }
  };
  const job = providerRequests.find((r) => r.id === id);

  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false); // kept for future use
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notification, setNotification] = useState("");

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

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
    showNotification("Customer notified that you are on the way!");
  };

  const markArrived = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "arrived" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "arrived" });
    showNotification("Customer notified that you have arrived!");
  };

  const startService = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "in_progress" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "in_progress" });
    showNotification("Service started! Customer has been notified.");
  };

  const completeJob = () => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "completed" } });
    socket.emit("update_job_status", { bookingId: job.id, status: "completed" });
    navigate(`/provider/job/${job.id}/report`);
  };

  const handleCall = () => {
    const phone = job?.customerPhone || "+919876543210";
    showNotification("Connecting via secure masked number...");
    window.open(`tel:${phone}`, "_self");
  };

  const openNavigation = () => {
    let url = '';
    if ((job as any).lat && (job as any).lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${(job as any).lat},${(job as any).lng}&travelmode=driving`;
    } else if (job.address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}&travelmode=driving`;
    } else {
      showNotification("No address available for navigation");
      return;
    }
    // '_system' opens Google Maps app on Android (Capacitor)
    window.open(url, '_system');
  };

  const renderActionBar = () => {
    switch (job.status) {
      case "accepted":
      case "assigned":
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={markOnTheWay}
            className="w-full py-4 rounded-[24px] bg-primary text-white font-extrabold text-[15px] flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(249,115,22,0.25)] transition-all"
          >
            <Navigation size={20} strokeWidth={2.5} /> I'm On the Way
          </motion.button>
        );
      case "on_the_way":
        return (
          <div className="space-y-4">
            <div className="bg-[#EEF2FF] border-2 border-[#E0E7FF] rounded-[24px] p-5 text-center shadow-sm">
              <span className="text-[14px] font-extrabold text-[#312E81] flex items-center justify-center gap-2 tracking-tight">
                <Car size={20} strokeWidth={2.5} /> Heading to Customer
              </span>
              <p className="text-[12px] font-medium text-[#4338CA] mt-2">Status updates automatically when you arrive within 100m</p>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openNavigation}
                className="flex-1 py-4 rounded-[20px] bg-white text-primary border-2 border-primary/20 font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-sm"
              >
                <Navigation size={18} strokeWidth={2.5} /> Navigate
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status: "arrived" } });
                  socket.emit("update_job_status", { bookingId: job.id, status: "arrived" });
                  showNotification("Marked as arrived!");
                }}
                className="flex-[1.5] py-4 rounded-[20px] bg-accent text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(245,158,11,0.25)]"
              >
                <MapPin size={18} strokeWidth={2.5} /> Mark Arrived
              </motion.button>
            </div>
          </div>
        );
      case "arrived":
        return (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={startService}
            className="w-full py-4 rounded-[24px] bg-primary text-white font-extrabold text-[15px] flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(249,115,22,0.25)] transition-all"
          >
            <Play size={20} strokeWidth={2.5} /> Start Service
          </motion.button>
        );
      case "in_progress": {
        const mins = Math.floor(elapsedSeconds / 60);
        const secs = elapsedSeconds % 60;
        return (
          <div className="space-y-4">
            <div className="bg-[#F0F9FF] border-2 border-[#E0F2FE] rounded-[24px] p-5 flex items-center justify-between shadow-sm">
              <span className="text-[14px] font-extrabold text-[#0C4A6E] flex items-center gap-2"><Timer size={20} strokeWidth={2.5} /> Time Elapsed</span>
              <span className="text-[24px] font-black text-[#0284C7] font-mono tracking-tight">{mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}</span>
            </div>
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openNavigation}
                className="flex-1 py-4 rounded-[20px] bg-white text-primary border-2 border-primary/20 font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-sm"
              >
                <Navigation size={18} strokeWidth={2.5} /> Navigate
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={completeJob}
                className="flex-[1.5] py-4 rounded-[20px] bg-emerald-500 text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(16,185,129,0.25)] transition-all"
              >
                <CheckCircle2 size={18} strokeWidth={2.5} /> Complete Job
              </motion.button>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-[140px]">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6 pb-4 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleBack} 
            className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={24} className="text-foreground" strokeWidth={2.5} />
          </motion.button>
          <h1 className="text-[20px] font-extrabold text-foreground tracking-tight">Active Job</h1>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-5 flex-1 space-y-6 mt-4"
      >
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#EFF6FF] text-[#1D4ED8] p-4 rounded-[20px] text-[13px] font-bold shadow-sm border border-[#BFDBFE]">
                {notification}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={itemVariants} className="bg-white border-2 border-transparent rounded-[24px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-[20px] bg-primary flex items-center justify-center text-white font-black text-[20px] shadow-lg shadow-primary/20">
              {job.customerName.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <p className="text-[18px] font-extrabold text-foreground tracking-tight">{job.customerName}</p>
              <p className="text-[13px] font-bold text-primary mt-1">{service?.label}</p>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCall} 
              className="flex-1 h-12 rounded-[16px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center gap-2 text-[14px] font-extrabold text-foreground transition-colors"
            >
              <Phone size={18} className="text-primary" strokeWidth={2.5} /> Call
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/chat/${job.id}`)} 
              className="flex-1 h-12 rounded-[16px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center gap-2 text-[14px] font-extrabold text-foreground transition-colors"
            >
              <MessageCircle size={18} className="text-primary" strokeWidth={2.5} /> Chat
            </motion.button>
          </div>

          <div className="h-px bg-border/50 my-6" />
          
          <div className="space-y-4">
            <Row icon={MapPin} text={job.address} />
            <Row icon={Calendar} text={job.date} />
            <Row icon={Clock} text={job.time} />
          </div>

          {job.notes && (
            <>
              <div className="h-px bg-border/50 my-6" />
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" /> Notes
              </p>
              <div className="bg-[#F8FAFC] rounded-[16px] p-4 text-[13px] text-foreground font-medium italic border-l-4 border-primary/20">
                "{job.notes}"
              </div>
            </>
          )}

          {job.voiceNote && job.voiceNoteUrl && (
            <>
              <div className="h-px bg-border/50 my-6" />
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <Mic size={14} className="text-primary" strokeWidth={2.5} /> Voice Note
              </p>
              <div className="bg-[#F8FAFC] rounded-[16px] p-4 border border-border/50 shadow-sm">
                <audio 
                  src={job.voiceNoteUrl} 
                  controls 
                  className="w-full h-10 accent-primary"
                />
              </div>
            </>
          )}
        </motion.div>

        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={openNavigation}
          className="w-full bg-white border-2 border-transparent hover:border-primary/10 rounded-[24px] p-5 flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all"
        >
          <div className="w-14 h-14 rounded-[16px] bg-[#F8FAFC] flex items-center justify-center shadow-sm">
            <Navigation size={24} className="text-primary" strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[16px] font-extrabold text-foreground tracking-tight">Open Navigation</p>
            <p className="text-[12px] font-medium text-muted-foreground mt-1">{job.lat ? "GPS coordinates ready" : job.address}</p>
          </div>
        </motion.button>

        <motion.div variants={itemVariants} className="bg-emerald-50 border-2 border-emerald-100 rounded-[24px] p-6 text-center shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600 mb-2">Estimated Earnings</p>
          <p className="text-[32px] font-black text-emerald-700 tracking-tight">₹{job.quote || job.price}</p>
        </motion.div>
      </motion.div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-6 bg-white/80 backdrop-blur-md border-t border-border z-10">
        {renderActionBar()}
      </div>

    </div>
  );
};

const Row = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="w-8 h-8 rounded-full bg-[#F8FAFC] flex items-center justify-center flex-shrink-0">
      <Icon size={16} className="text-primary" strokeWidth={2.5} />
    </div>
    <span className="text-[14px] font-bold text-foreground">{text}</span>
  </div>
);

export default Job;