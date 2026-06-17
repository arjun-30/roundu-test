import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Calendar, Clock, Phone, Navigation,
  Play, CheckCircle2, Car, Timer, Loader2, MessageCircle,
  Mic, Navigation2, Flag, Wrench
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getServiceById } from "@/data/mockData";
import { socket } from "@/lib/socket";

const JOB_STAGES = [
  {
    key: "on_the_way",
    label: "Started",
    icon: Navigation2,
    color: "bg-[#152E4B]",
    ring: "ring-[#152E4B]/30",
  },
  {
    key: "arrived",
    label: "Arrived",
    icon: MapPin,
    color: "bg-[#F59E0B]",
    ring: "ring-[#F59E0B]/30",
  },
  {
    key: "completed",
    label: "Completed",
    icon: Flag,
    color: "bg-[#1C651B]",
    ring: "ring-[#1C651B]/30",
  },
  {
    key: "paid",
    label: "Paid",
    icon: CheckCircle2,
    color: "bg-[#1C651B]",
    ring: "ring-[#1C651B]/30",
  }
];
type StageKey = typeof JOB_STAGES[number]["key"];
const STATUS_ORDER = [
  "accepted",
  "assigned",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "payment_pending",
  "paid"
];
const Job = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id = "" } = useParams();
  const {
    providerRequests,
    dispatch,
    walletBalance
  } = useApp() as any;
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  } as any;

  const handleBack = () => {
    navigate("/provider", { replace: true });
  };

  let job = providerRequests.find((r) => r.id === id);



  const [notification, setNotification] = useState("");
  const [notifType, setNotifType] = useState<"info" | "success">("info");

  const showNotification = (msg: string, type: "info" | "success" = "info") => {
    setNotification(msg);
    setNotifType(type);
    setTimeout(() => setNotification(""), 3000);
  };

  const [notFoundTimer, setNotFoundTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!job) {
      const t = setTimeout(() => { navigate("/provider", { replace: true }); }, 3000);
      setNotFoundTimer(t);
      return () => clearTimeout(t);
    } else {
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

  // ── Stage helpers ────────────────────────────────────────────────────────
  const visualStatus =
    job.status === "paid"
      ? "paid"
      : ["completed", "payment_pending"].includes(job.status)
        ? "completed"
        : job.status === "arrived"
          ? "arrived"
          : "on_the_way";
  const currentStatusIndex =
    JOB_STAGES.findIndex(
      s => s.key === visualStatus
    );

  const isStageCompleted = (stageKey: StageKey) =>
    JOB_STAGES.findIndex(
      s => s.key === stageKey
    ) < currentStatusIndex;

  const isStageActive = (stageKey: StageKey) =>
    visualStatus === stageKey;

  // ── Emit helpers ─────────────────────────────────────────────────────────
  const emitStatus = (status: any) => {
    dispatch({ type: "UPDATE_REQUEST", id: job.id, patch: { status, ...(status === "paid" ? { paid: true } : {}) } });
    socket.emit("update_job_status", { bookingId: job.id, status, ...(status === "paid" ? { paid: true } : {}) });
  };

  const markArrived = () => { emitStatus("arrived"); showNotification("📍 Customer notified — you've arrived!", "info"); };



  const completeJob = () => {
    emitStatus("payment_pending");

    showNotification(
      "Waiting for payment confirmation",
      "info"
    );
  }; const confirmCashReceived = () => {
    emitStatus("paid");

    showNotification(
      "Payment received successfully",
      "success"
    );
  };

  const waitForOnlinePayment = () => {
    emitStatus("payment_pending");

    showNotification(
      "Waiting for online payment",
      "info"
    );
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
    window.open(url, '_system');
  };

  // ── CTA per status ───────────────────────────────────────────────────────
  const renderActionBar = () => {
    const actionStatus =
      job.status === "paid"
        ? "paid"
        : ["completed", "payment_pending"].includes(job.status)
          ? "completed"
          : job.status;

    switch (actionStatus) {
      case "accepted":
      case "assigned":
      case "on_the_way":
        return (
          <div className="flex gap-3">

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openNavigation}
              className="flex-1 py-4 rounded-[20px] bg-white text-primary border-2 border-primary/20 font-extrabold"
            >
              Navigate
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={markArrived}
              className="flex-[1.5] py-4 rounded-[20px] bg-[#F59E0B] text-white font-extrabold"
            >
              Mark Arrived
            </motion.button>

          </div>
        );
      case "arrived":
        return (
          <div className="flex gap-3">

            <button
              onClick={openNavigation}
              className="flex-1 py-4 rounded-[20px] bg-white border"
            >
              Navigate
            </button>

            <button
              onClick={completeJob}
              className="flex-[1.5] py-4 rounded-[20px] bg-[#1C651B] text-white font-extrabold"
            >
              Complete Job
            </button>

          </div>
        );

      case "completed":
        return (
          <div className="space-y-4">

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="font-bold text-yellow-800">
                Payment Pending
              </p>

              <p className="text-sm text-yellow-700 mt-1">
                Choose payment method. Provider cannot accept
                another Quick Fix job until payment is completed.
              </p>
            </div>

            {/* ROUNDU QR PAYMENT */}
            <div className="bg-white border rounded-2xl p-5 text-center">

              <img
                src="/qr-demo.png"
                alt="RoundU QR"
                className="w-44 h-44 mx-auto"
              />

              <p className="font-bold mt-3">
                RoundU Payments
              </p>

              <p className="text-sm text-gray-500">
                UPI ID: payments@roundu
              </p>

              <p className="text-lg font-bold mt-2">
                ₹{job.quote || (job as any).price}
              </p>

            </div>
            <div className="flex items-center justify-center">
              <div className="h-px bg-gray-200 flex-1" />
              <span className="px-4 text-sm font-semibold text-gray-500">
                OR
              </span>
              <div className="h-px bg-gray-200 flex-1" />
            </div>

            {/* CASH PAYMENT */}
            <button
              onClick={() => {
                const confirmed = window.confirm(
                  "Confirm cash has been received?"
                );

                if (!confirmed) return;

                const amount = Number(
                  job.quote || (job as any).price || 0
                );

                const commission = amount * 0.15;

                if (walletBalance > 0) {
                  dispatch({
                    type: "UPDATE_WALLET",
                    amount: -commission
                  });
                } else {
                  dispatch({
                    type: "UPDATE_WALLET",
                    amount: -commission
                  });

                  dispatch({
                    type: "ADD_COMMISSION_DUE",
                    amount: commission
                  });
                }

                dispatch({
                  type: "INCREMENT_COD_COUNT"
                });

                emitStatus("paid");

                showNotification(
                  "Cash payment confirmed",
                  "success"
                );
              }}
              className="w-full py-4 rounded-full bg-[#1C651B] hover:opacity-90 text-white font-bold shadow-md transition-all"            >
              Receive Cash            </button>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
              <p className="text-xs text-gray-600">
                Online Payment → Money goes to RoundU App account.
              </p>

              <p className="text-xs text-gray-600 mt-1">
                Cash Payment → Provider collects cash and platform
                commission will be deducted from provider wallet.
              </p>
            </div>

          </div >
        );

      case "paid":
        return (
          <div className="bg-[#1C651B]/10 border border-[#1C651B]/20 rounded-2xl p-5 text-center">

            <CheckCircle2
              size={50}
              className="mx-auto text-[#1C651B]"
            />

            <p className="mt-3 font-bold text-[#1C651B]">
              Payment Successful
            </p>

            <p className="text-sm text-[#1C651B] mt-2">
              Job completed and earnings processed.
            </p>

          </div>
        );

      default:
        return null;
    }
  };
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-6 pb-4 flex items-center justify-between bg-white sticky top-0 z-50 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleBack}
            className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={24} className="text-foreground" strokeWidth={2.5} />
          </motion.button>
          <h1 className="text-[20px] font-extrabold text-foreground tracking-tight">Active Job</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#1C651B] animate-pulse" />
          <span className="text-xs text-[#1C651B] font-semibold">Live</span>
        </div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-5 flex-1 overflow-y-auto pb-32 space-y-5 mt-4">

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className={`p-4 rounded-[20px] text-[13px] font-bold shadow-sm border ${notifType === "success"
                ? "bg-[#1C651B]/10 text-[#1C651B] border-[#1C651B]/20"
                : "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
                }`}>
                {notification}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 4-Stage Progress Stepper ─────────────────────────────────── */}
        <motion.div variants={itemVariants} className="bg-white border-2 border-transparent rounded-[24px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
          <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-4">Job Progress</p>
          <div className="flex items-start gap-0">
            {JOB_STAGES.map((stage, idx) => {
              const done = isStageCompleted(stage.key);
              const active = isStageActive(stage.key);
              const Icon = stage.icon;
              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center relative">
                  {idx < JOB_STAGES.length - 1 && (
                    <div className="absolute top-4 left-1/2 w-full h-0.5 z-0">
                      <div className={`h-full transition-all duration-700 ${done ? stage.color : "bg-border"}`} />
                    </div>
                  )}
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${done ? `${stage.color} shadow-md` : active ? `${stage.color} shadow-lg ring-4 ${stage.ring} scale-110` : "bg-input border-2 border-border"
                    }`}>
                    <Icon size={14} className={done || active ? "text-white" : "text-muted-foreground"} />
                    {active && <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-current" />}
                  </div>
                  <p className={`text-[9px] font-bold mt-1.5 text-center leading-tight transition-colors ${done || active ? "text-foreground" : "text-muted-foreground"}`}>
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Customer card */}
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
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCall}
              className="flex-1 h-12 rounded-[16px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center gap-2 text-[14px] font-extrabold text-foreground transition-colors"
            >
              <Phone size={18} className="text-primary" strokeWidth={2.5} /> Call
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate(`/chat/${job.id}`)}
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
                <audio src={job.voiceNoteUrl} controls className="w-full h-10 accent-primary" />
              </div>
            </>
          )}
        </motion.div>

        {/* Navigation */}
        <motion.button variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
          onClick={openNavigation}
          className="w-full bg-white border-2 border-transparent hover:border-primary/10 rounded-[24px] p-5 flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all"
        >
          <div className="w-14 h-14 rounded-[16px] bg-[#F8FAFC] flex items-center justify-center shadow-sm">
            <Navigation size={24} className="text-primary" strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[16px] font-extrabold text-foreground tracking-tight">Open Navigation</p>
            <p className="text-[12px] font-medium text-muted-foreground mt-1">{(job as any).lat ? "GPS coordinates ready" : job.address}</p>
          </div>
        </motion.button>

        {/* Earnings */}
        <motion.div variants={itemVariants} className="bg-[#1C651B]/10 border-2 border-[#1C651B]/20 rounded-[24px] p-6 text-center shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#1C651B] mb-2">Estimated Earnings</p>
          <p className="text-[32px] font-black text-[#1C651B] tracking-tight">₹{job.quote || (job as any).price}</p>
        </motion.div>
      </motion.div>

      {/* Fixed action bar */}
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