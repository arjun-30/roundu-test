import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Wallet, User, MapPin, Calendar, Clock, Check, X,
  Power, Star, TrendingUp, AlertTriangle, Lightbulb,
  ChevronRight, Inbox, Briefcase, FileText, Image as ImageIcon, Video, Play, Mic, Eye,
  ClipboardCheck, Images, Wrench, LogOut
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getServiceById, ProviderRequest } from "@/data/mockData";
import EmptyState from "@/components/EmptyState";
import IncomingRequestPopup from "@/components/IncomingRequestPopup";
import LocationModal from "@/components/LocationModal";
import { socket } from "@/lib/socket";
import { getShortAddress, getDistance } from "@/lib/utils";
import { useCurrentLocation } from "@/hooks/useLocation";
import { reverseGeocode } from "@/lib/mapProvider";
import { motion, AnimatePresence } from "framer-motion";

const formatRupees = (amount: number): string => {
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { providerRequests, completedJobs, dispatch, user, isOnline, providerStats, liveBroadcasts, notifications, quotedBroadcasts, currentLocation } = useApp() as any;

  // Sync role to provider on mount
  useEffect(() => {
    dispatch({ type: "SET_ROLE", role: "provider" });
  }, [dispatch]);
  const [showWarning, setShowWarning] = useState(true);
  const {
    walletBalance = 0,
    commissionDue = 0,
    codPendingCount = 0,
    isFrozen = false
  } = useApp() as any;

  const hasPaymentPendingJob = providerRequests.some(
    (r: any) => r.status === "payment_pending"

  );
  const canAcceptScheduledJob = (job: any) => {
    const activeJob = providerRequests.find((r: any) =>
      [
        "accepted",
        "assigned",
        "on_the_way",
        "arrived",
        "in_progress",
        "payment_pending"
      ].includes(r.status)
    );

    if (!activeJob) return true;

    const now = new Date();

    const scheduledTime = new Date(
      `${job.date} ${job.time}`
    );

    const diffHours =
      (scheduledTime.getTime() - now.getTime()) /
      (1000 * 60 * 60);

    return diffHours >= 6;
  };
  const [selectedJob, setSelectedJob] = useState<ProviderRequest | null>(null);
  const [simulatedRequest, setSimulatedRequest] = useState<ProviderRequest | null>(null);

  const [locating, setLocating] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [quotingBroadcast, setQuotingBroadcast] = useState<any | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteEta, setQuoteEta] = useState("15");

  const isCritical = providerStats.rating < 4.0 || (providerStats.responseRate > 0 && providerStats.responseRate < 50);

  const [activeDirectRequest, setActiveDirectRequest] = useState<any | null>(null);
  // ✅ Direct local broadcast state — bypasses AppContext context re-render issues
  const [activeBroadcast, setActiveBroadcast] = useState<any | null>(null);
  // Key seen IDs per-user so multiple providers on the same device don't share a seen-set
  const seenKey = `seen_broadcast_ids_${user?.id || 'anon'}`;
  const seenBroadcastIds = useRef(new Set<string>(
    JSON.parse(sessionStorage.getItem(seenKey) || "[]")
  ));

  const pending = providerRequests.filter((r) => r.status === "pending");
  const accepted = providerRequests.filter((r) => r.status === "accepted" || r.status === "assigned" || r.status === "in_progress" || r.status === "on_the_way" || r.status === "arrived");
  const earnings = completedJobs.reduce((s, j) => s + (Number(j.price) || 0), 0);
  const todayDateStr = new Date().toDateString();
  const todayEarnings = completedJobs
    .filter((j: any) => {
      if (!j.date || j.date === "Today") return true;
      const d = new Date(j.date);
      return !isNaN(d.getTime()) && d.toDateString() === todayDateStr;
    })
    .reduce((s: number, j: any) => s + (Number(j.price) || 0), 0);

  const isBusy = providerRequests.some((r: any) => {
    // Check if job is stale (older than 24 hours)
    let start = r.scheduled_at ? new Date(r.scheduled_at) : null;
    if (!start || isNaN(start.getTime())) {
      if (r.date && r.time) {
        if (r.time.toLowerCase() === 'now') {
          start = new Date();
        } else {
          start = new Date(`${r.date} ${r.time}`);
        }
      }
    }

    if (start && !isNaN(start.getTime())) {
      const ageHours = (new Date().getTime() - start.getTime()) / (1000 * 60 * 60);
      if (ageHours > 24) return false; // Ignore stale jobs
    }

    if (
      [
        "in_progress",
        "on_the_way",
        "arrived",
        "payment_pending"
      ].includes(r.status)
    ) {
      return true;
    }
    if (["assigned", "accepted"].includes(r.status)) {
      if (start && !isNaN(start.getTime())) {
        const durationHours = r.duration || 2;
        const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
        const now = new Date();
        if (now >= start && now <= end) {
          return true;
        }
      }
    }
    return false;
  });

  const toggleOnline = () => {
    const nextStatus = !isOnline;
    dispatch({ type: "SET_ONLINE", value: nextStatus });
    socket.emit("toggle_online", { userId: user.id, isOnline: nextStatus });
  };

  // Alert provider when a new direct request arrives
  useEffect(() => {
    const handleNewRequest = (request: any) => {
      // Show the popup at the top
      setActiveDirectRequest(request);
      // Add to global state so it appears in the list without refresh!
      dispatch({ type: "ADD_PROVIDER_REQUEST", request });
    };
    socket.on("incoming_request", handleNewRequest);
    return () => {
      socket.off("incoming_request", handleNewRequest);
    };
  }, [dispatch]);

  // Auto-fetch GPS on mount → reverse geocode → update user.address
  const handleLocationFetched = useCallback(async (lat: number, lng: number) => {
    dispatch({ type: "SET_CURRENT_LOCATION", lat, lng });
    setLocating(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (result.address) {
        const cityCountry = getShortAddress(result.city ? `${result.city}, India` : result.address);
        if (cityCountry) {
          dispatch({ type: "UPDATE_USER", user: { address: cityCountry } });
        }
      }
    } catch (err) {
      console.warn("Reverse geocode failed:", err);
      dispatch({ type: "UPDATE_USER", user: { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` } });
    } finally {
      setLocating(false);
    }
  }, [dispatch]);
  const { loading: gpsLoading } = useCurrentLocation(handleLocationFetched);

  // ✅ Listen for live broadcasts DIRECTLY in Dashboard (bypasses context closure issue)
  useEffect(() => {
    const handleBroadcast = (broadcast: any) => {
      console.log("Broadcast received:", broadcast);
      console.log("Images:", broadcast.images);
      console.log("[Dashboard] 📡 incoming_broadcast received locally:", broadcast.broadcastId);
      if (seenBroadcastIds.current.has(broadcast.broadcastId)) return; // deduplicate

      // 🕐 Reject stale broadcasts — if older than 120 seconds, ignore silently
      const POPUP_TTL_MS = 120 * 1000;
      const broadcastAge = Date.now() - (broadcast.createdAt || 0);
      if (broadcastAge > POPUP_TTL_MS) {
        console.log("[Dashboard] ⏰ Broadcast expired, skipping:", broadcast.broadcastId);
        seenBroadcastIds.current.add(broadcast.broadcastId); // mark as seen so it won't show later
        const updated = Array.from(seenBroadcastIds.current);
        sessionStorage.setItem(seenKey, JSON.stringify(updated));
        return;
      }

      seenBroadcastIds.current.add(broadcast.broadcastId);
      const updated = Array.from(seenBroadcastIds.current);
      sessionStorage.setItem(seenKey, JSON.stringify(updated));
      setActiveBroadcast(broadcast);
    };
    socket.on("incoming_broadcast", handleBroadcast);
    return () => { socket.off("incoming_broadcast", handleBroadcast); };
  }, []);

  useEffect(() => {
    const handleJobTaken = (data: { broadcastId: string; acceptedProviderId: string }) => {
      dispatch({ type: "REMOVE_LIVE_BROADCAST", id: data.broadcastId });

      if (activeBroadcast && activeBroadcast.broadcastId === data.broadcastId) {
        setActiveBroadcast(null);
        alert("This request is no longer available. Customer already selected another provider.");
      }
      if (quotingBroadcast && quotingBroadcast.broadcastId === data.broadcastId) {
        setQuotingBroadcast(null);
        alert("This request is no longer available. Customer already selected another provider.");
      }
    };
    socket.on("job_taken", handleJobTaken);
    return () => {
      socket.off("job_taken", handleJobTaken);
    };
  }, [dispatch, activeBroadcast, quotingBroadcast]);

  useEffect(() => {
    const handleQuoteError = (data: { message: string }) => {
      dispatch({ type: "ADD_NOTIFICATION", text: `⚠️ Quote Error: ${data.message}` });
      alert(`Quote Error: ${data.message}`);
    };
    socket.on("quote_error", handleQuoteError);
    return () => {
      socket.off("quote_error", handleQuoteError);
    };
  }, [dispatch]);

  useEffect(() => {
    const handleQuoteAccepted = (data: {
      broadcastId: string;
      bookingId: string;
      serviceId: string;
      customerName: string;
      customerPhone?: string;
      address: string;
      lat?: number;
      lng?: number;
      price: number;
      date: string;
      time: string;
      status: string;
      notes?: string;
      voiceNote?: boolean;
      voiceNoteUrl?: string | null;
    }) => {
      console.log("[socket] quote_accepted received:", data);

      // Add to providerRequests so Job.tsx can find it
      dispatch({
        type: "ADD_PROVIDER_REQUEST",
        request: {
          id: data.bookingId,
          customerName: data.customerName || "Customer",
          customerPhone: data.customerPhone || "9999999991",
          serviceId: data.serviceId,
          address: data.address || "Customer Location",
          lat: data.lat,
          lng: data.lng,
          status: "assigned",
          date: data.date || new Date().toISOString().slice(0, 10),
          time: data.time || "Now",
          price: data.price || 0,
          notes: data.notes || "",
          voiceNote: data.voiceNote || false,
          voiceNoteUrl: data.voiceNoteUrl || undefined,
        }
      });

      // Navigate to Chat — enables immediate customer ↔ provider communication
      navigate(`/chat/${data.bookingId}`);
    };

    socket.on("quote_accepted", handleQuoteAccepted);
    return () => { socket.off("quote_accepted", handleQuoteAccepted); };
  }, [dispatch, navigate]);

  const handleSubmitQuote = () => {
    if (!quotingBroadcast || !quotePrice) return;

    let distanceKm = 0;
    if (quotingBroadcast && quotingBroadcast.lat != null && quotingBroadcast.lng != null && currentLocation) {
      const qlat = Number(quotingBroadcast.lat);
      const qlng = Number(quotingBroadcast.lng);
      if (!isNaN(qlat) && !isNaN(qlng)) {
        try {
          distanceKm = Math.round(getDistance(currentLocation, { lat: qlat, lng: qlng }) * 10) / 10;
        } catch (e) {
          distanceKm = 0;
        }
      }
    }

    socket.emit("submit_quote", {
      broadcastId: quotingBroadcast.broadcastId,
      customerId: quotingBroadcast.customerId,
      providerId: user.id,
      providerName: user.name,
      providerAvatar: user.name.charAt(0),
      providerPhone: user.phone || "9999999992",
      price: Number(quotePrice),
      rating: providerStats.rating || 0,
      distanceKm,
      etaMin: Number(quoteEta),
      reviews: 0
    });

    dispatch({ type: "ADD_QUOTED_BROADCAST", id: quotingBroadcast.broadcastId });
    setQuotingBroadcast(null);
    setActiveBroadcast(null);
    setQuotePrice("");
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  } as any;

  return (
    <div className="min-h-full flex flex-col bg-background pb-24 relative provider-theme">

      {/* ✅ Incoming Broadcast Popup — uses local socket state (bypasses context issue) */}
      {activeBroadcast && !quotingBroadcast && !(quotedBroadcasts && quotedBroadcasts.includes(activeBroadcast.broadcastId)) && (
        <IncomingRequestPopup
          request={activeBroadcast}
          isBroadcast={true}
          onAccept={() => {

            const req = activeBroadcast;

            if (isFrozen) {
              alert("Account frozen. Clear dues first.");
              return;
            }

            if (
              req?.jobType === "quick_fix" &&
              hasPaymentPendingJob
            ) {
              alert(
                "Complete payment collection before accepting another Quick Fix."
              );
              return;
            }

            if (
              req?.jobType === "scheduled" &&
              !canAcceptScheduledJob(req)
            ) {
              alert(
                "Scheduled jobs must be at least 6 hours away."
              );
              return;
            }

            setQuotingBroadcast(activeBroadcast);
          }}

          onReject={() => {
            dispatch({
              type: "REMOVE_LIVE_BROADCAST",
              id: activeBroadcast.broadcastId
            });

            setActiveBroadcast(null);
          }}
        />
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-[80] px-4 sm:px-5 pt-3 pb-3 flex items-center justify-between gap-3 bg-white shadow-sm pointer-events-auto isolate"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0 pointer-events-auto">
          {/* Profile Photo */}
          <div className="w-14 h-14 rounded-full flex-shrink-0 bg-slate-100 border border-border overflow-hidden flex items-center justify-center mt-1">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <img
                src={`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%233B82F6"/><stop offset="100%" stop-color="%232563EB"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="url(%23g)"/><path d="M50 25c6.627 0 12 5.373 12 12s-5.373 12-12 12-12-5.373-12-12 5.373-12 12-12zm-24 45c0-11.046 8.954-20 20-20h8c11.046 0 20 8.954 20 20v2H26v-2z" fill="white" fill-opacity="0.95"/></svg>`}
                alt="Default Avatar"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Greeting and Location */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-semibold tracking-wide uppercase leading-tight">Provider Dashboard</p>
            <h1 className="text-[22px] font-extrabold text-foreground mt-0.5 tracking-tight truncate">Hi, {user.name.split(" ")[0] || "Provider"}</h1>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="group relative z-[82] flex max-w-full items-center gap-1.5 mt-1 cursor-pointer pointer-events-auto"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors flex-shrink-0">
                <MapPin size={10} className="text-primary group-hover:text-accent transition-colors" />
              </div>
              <p className="text-[12px] font-bold text-muted-foreground group-hover:text-primary transition-colors max-w-[135px] sm:max-w-[240px] truncate">
                {locating || gpsLoading ? (
                  <span className="flex items-center gap-1">
                    <span className="block h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Detecting...
                  </span>
                ) : (
                  getShortAddress(user.address) || "Set Location"
                )}
              </p>
            </button>
          </div>
        </div>
        <div className="relative z-[82] flex shrink-0 gap-2 sm:gap-3 items-center pointer-events-auto">
          {/* Online/Offline Toggle */}
          <div className="flex flex-col items-center gap-1 mt-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={toggleOnline}
              className={`relative z-[83] w-[36px] h-6 rounded-full p-0.5 transition-all flex items-center shadow-inner pointer-events-auto ${isOnline ? 'bg-success border-success/20' : 'bg-[#E2E8F0] border-transparent'} border-2 ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isOnline ? 'translate-x-[14px]' : 'translate-x-0'}`} />
            </button>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-success' : 'text-muted-foreground'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/provider/profile")}
              className="relative z-[83] w-[42px] h-[42px] rounded-[14px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center transition-all shadow-sm pointer-events-auto"
              title="Provider Profile"
            >
              <User size={20} className="text-primary" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="relative z-[83] w-[42px] h-[42px] rounded-[14px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center transition-all shadow-sm pointer-events-auto"
              title="Notifications"
            >
              <Bell size={20} className="text-primary" strokeWidth={2.5} />
              {(pending.length > 0 || notifications.length > 0) && (
                <span className="pointer-events-none absolute right-2 top-2 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white" />
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        className="relative z-0 flex-1 overflow-y-auto pt-3 pb-6"
      >
        {isFrozen && (
          <div className="mx-5 mt-4 mb-4">
            <div className="bg-red-50 border border-red-300 rounded-2xl p-4">
              <p className="font-bold text-red-700">
                🚫 Account Frozen
              </p>

              <p className="text-sm text-red-600 mt-1">
                Outstanding commission dues detected.
                Clear dues to receive new jobs.
              </p>
            </div>
          </div>
        )}
        {/* Active Booking Lock Banner */}
        <AnimatePresence>
          {isBusy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-5 mb-2 mt-4 overflow-hidden"
            >
              <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[20px] p-4 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-[#D97706]" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[14px] font-extrabold text-[#92400E]">Active Job Lock</p>
                  <p className="text-[12px] text-[#B45309] mt-1 leading-relaxed font-medium">
                    You are currently on an active job. Finish this job to accept new bookings.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Warning Banner */}
        <AnimatePresence>
          {(() => {
            let warning = null;
            if (providerStats.responseRate > 0 && providerStats.responseRate < 90) {
              warning = {
                type: "warning",
                title: "Response Rate Low",
                message: `Your response rate is ${providerStats.responseRate}%. Accept more jobs to stay in good standing.`,
                bg: "bg-[#FFF7ED]",
                border: "border-[#FFEDD5]",
                text: "text-[#9A3412]",
                subtext: "text-[#C2410C]",
                iconColor: "text-[#F97316]",
                iconBg: "bg-[#FFEDD5]"
              };
            }

            if (!warning || !showWarning) return null;

            return (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-5 mb-4 mt-2 overflow-hidden"
              >
                <div className={`${warning.bg} ${warning.border} border rounded-[20px] p-4 flex items-start gap-4 relative shadow-sm`}>
                  <div className={`w-10 h-10 rounded-full ${warning.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <AlertTriangle size={20} className={warning.iconColor} strokeWidth={2} />
                  </div>
                  <div className="pr-8">
                    <p className={`text-[14px] font-extrabold ${warning.text}`}>{warning.title}</p>
                    <p className={`text-[12px] font-medium ${warning.subtext} mt-1 leading-relaxed`}>{warning.message}</p>
                  </div>
                  <button onClick={() => setShowWarning(false)} className={`absolute top-4 right-4 p-1.5 rounded-full hover:${warning.iconBg} ${warning.iconColor} transition-colors`}>
                    <X size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>

        {/* Live Job Broadcasts (Moved to Top) */}
        {isOnline && !isBusy && liveBroadcasts.length > 0 && (
          <div className="px-5 mb-6 mt-4">
            <h2 className="text-[16px] font-extrabold text-foreground mb-3 flex items-center gap-2 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              Live Job Requests
            </h2>
            <div className="space-y-4">
              {liveBroadcasts.map((b) => {
                const service = getServiceById(b.serviceId);
                const isQuoted = b.status === "waiting_for_customer" || (quotedBroadcasts && quotedBroadcasts.includes(b.broadcastId));
                return (
                  <div
                    key={b.broadcastId}
                    className="bg-[#FFFBEB] border-2 border-[#FDE68A] rounded-[24px] p-5 shadow-[0_8px_30px_rgba(245,158,11,0.06)] relative overflow-hidden"
                  >
                    <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-accent/10 rounded-full blur-[40px] pointer-events-none" />
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-[20px] bg-accent flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent/20 z-10">
                        {service && <service.icon size={24} className="text-white" strokeWidth={2} />}
                      </div>
                      <div className="flex-1 min-w-0 z-10">
                        <p className="text-[16px] font-extrabold text-foreground">{b.customerName}</p>
                        <p className="text-[11px] text-accent font-black uppercase tracking-widest mt-0.5">{service?.label || b.serviceId}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[12px] font-semibold text-[#92400E]">
                          <span className="flex items-center gap-1.5 bg-[#FEF3C7] px-2 py-1 rounded-md"><MapPin size={12} /> {b.address}</span>
                          <span className="flex items-center gap-1.5 bg-[#FEF3C7] px-2 py-1 rounded-md"><Clock size={12} /> {b.time}</span>
                        </div>
                        {b.notes && <p className="text-[12px] text-[#92400E] mt-3 font-medium italic border-l-2 border-[#FDE68A] pl-3">"{b.notes}"</p>}
                        {b.voiceNoteUrl && (
                          <div className="mt-3 bg-white rounded-[14px] p-3 border border-[#FDE68A] shadow-sm">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-accent uppercase tracking-widest mb-2">
                              <Mic size={12} /> Voice Note Attached
                            </div>
                            <audio
                              src={b.voiceNoteUrl}
                              controls
                              className="w-full h-8"
                              onError={(e) => {
                                console.error("Audio playback error:", e);
                                (e.target as any).insertAdjacentHTML('afterend', '<p class="text-[10px] text-red-500 font-bold mt-1">Error loading audio</p>');
                              }}
                            />
                          </div>
                        )}

                        <div className="flex gap-3 mt-4">
                          {isQuoted ? (
                            <button
                              disabled
                              className="flex-1 py-3 bg-white text-muted-foreground border-2 border-[#FDE68A] rounded-[16px] text-[13px] font-bold cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              ⏳ Waiting for customer...
                            </button>
                          ) : (
                            <>
                              <button
                                disabled={isBusy}
                                onClick={() => setQuotingBroadcast(b)}
                                className={`flex-1 py-3 rounded-[16px] text-[13px] font-bold shadow-md ${isBusy ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60 shadow-none' : 'bg-accent text-white shadow-accent/20'
                                  }`}
                              >
                                Provide Quote
                              </button>
                              <button
                                onClick={() => dispatch({ type: "REMOVE_LIVE_BROADCAST", id: b.broadcastId })}
                                className="px-4 py-3 border-2 border-transparent hover:border-[#FDE68A] text-[#B45309] rounded-[16px] text-[13px] font-bold bg-[#FEF3C7]"
                              >
                                Skip
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Provider Wallet & Compliance */}
        <div className="px-5 mb-6">
          <div
            className={`rounded-[24px] p-5 shadow-lg ${isFrozen
              ? "bg-gradient-to-r from-red-600 to-red-700"
              : codPendingCount > 0
                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                : "bg-gradient-to-r from-[#0F172A] to-[#1E293B]"
              } text-white`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase tracking-widest opacity-80">
                  Provider Wallet
                </p>

                <h2 className="text-3xl font-black mt-2">
                  ₹{formatRupees(Number(walletBalance) || 0)}
                </h2>
              </div>

              <Wallet size={28} />
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Commission Due</span>
                <span className="font-bold">₹{formatRupees(Number(commissionDue) || 0)}</span>
              </div>

              <div className="flex justify-between">
                <span>COD Pending Jobs</span>
                <span className="font-bold">{codPendingCount}</span>
              </div>

              <div className="flex justify-between">
                <span>Platform Share</span>
                <span className="font-bold">15%</span>
              </div>
            </div>

            {hasPaymentPendingJob && (
              <div className="mt-4 bg-white/20 rounded-xl p-3">
                <p className="font-bold text-sm">
                  Quick Fix Locked
                </p>

                <p className="text-xs opacity-90 mt-1">
                  Complete payment collection before accepting another Quick Fix job.
                </p>
              </div>
            )}

            {isFrozen && (
              <div className="mt-4 bg-white/20 rounded-xl p-3">
                <p className="font-bold">
                  Account Frozen
                </p>

                <p className="text-xs mt-1">
                  Clear outstanding commission dues to receive new bookings.
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Stats Row */}
        <div className="px-5 mb-6 mt-4">
          <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-5 px-5">
            <div className="bg-white border-2 border-transparent hover:border-emerald-500/20 rounded-[24px] p-5 min-w-[140px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex-shrink-0 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg">
                <Wallet size={14} strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-widest font-black">Earnings</span>
              </div>
              <p className="text-[24px] font-black text-foreground tracking-tight">₹{formatRupees(todayEarnings)}</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Earned Today</p>
            </div>
            <div className="bg-white border-2 border-transparent hover:border-primary/20 rounded-[24px] p-5 min-w-[140px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex-shrink-0 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-primary bg-primary/10 w-fit px-2.5 py-1 rounded-lg">
                <Briefcase size={14} strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-widest font-black">Completed</span>
              </div>
              <p className="text-[24px] font-black text-foreground tracking-tight">{completedJobs.length}</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Total Jobs</p>
            </div>
            <div className="bg-white border-2 border-transparent hover:border-accent/20 rounded-[24px] p-5 min-w-[140px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex-shrink-0 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-accent bg-accent/10 w-fit px-2.5 py-1 rounded-lg">
                <Star size={14} fill="currentColor" strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-widest font-black">Rating</span>
              </div>
              <p className="text-[24px] font-black text-foreground tracking-tight">{Number(providerStats.rating || 0).toFixed(1)}</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Out of 5.0</p>
            </div>
            <div className="bg-white border-2 border-transparent hover:border-emerald-500/20 rounded-[24px] p-5 min-w-[140px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex-shrink-0 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg">
                <TrendingUp size={14} strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-widest font-black">Response</span>
              </div>
              <p className="text-[24px] font-black text-foreground tracking-tight">{providerStats.responseRate}%</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Acceptance Rate</p>
            </div>
          </div>
        </div>

        {/* AI Tip Card */}
        <div className="px-5 mb-6">
          <div className="bg-gradient-to-r from-primary/5 to-transparent border border-primary/10 rounded-[20px] p-5 flex gap-4 items-start shadow-sm relative overflow-hidden">
            <div className="w-12 h-12 rounded-[16px] bg-white shadow-sm flex items-center justify-center flex-shrink-0 relative z-10">
              <Lightbulb size={24} className="text-primary" />
            </div>
            <div className="relative z-10">
              <p className="text-[14px] font-extrabold text-foreground mb-1 tracking-tight">Smart Suggestion</p>
              <p className="text-[12px] font-medium text-muted-foreground leading-relaxed">
                Stay online to receive real-time job requests and increase your daily earnings.
              </p>
            </div>
            <div className="absolute top-[-20%] right-[-10%] w-[100px] h-[100px] bg-primary/10 rounded-full blur-[30px] pointer-events-none" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-5 mb-8">
          <h2 className="text-[16px] font-extrabold text-foreground mb-4 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/provider/jobs')}
              className="bg-white rounded-[24px] p-5 flex flex-col items-start gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-transparent hover:border-primary/10 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] flex items-center justify-center text-primary">
                <ClipboardCheck size={24} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-foreground tracking-tight">My Jobs</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{accepted.length + pending.length} active jobs</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/provider/earnings')}
              className="bg-white rounded-[24px] p-5 flex flex-col items-start gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-transparent hover:border-emerald-500/10 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] flex items-center justify-center text-emerald-500">
                <Wallet size={24} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-foreground tracking-tight">My Earnings</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5">₹{formatRupees(earnings)} earned</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/provider/portfolio')}
              className="bg-white rounded-[24px] p-5 flex flex-col items-start gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-transparent hover:border-purple-500/10 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] flex items-center justify-center text-purple-500">
                <Images size={24} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-foreground tracking-tight">My Portfolio</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Showcase work</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/provider/documents')}
              className="bg-white rounded-[24px] p-5 flex flex-col items-start gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-transparent hover:border-blue-500/10 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] flex items-center justify-center text-blue-500">
                <FileText size={24} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-foreground tracking-tight">Documents</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5">KYC & Verify</p>
              </div>
            </button>
          </div>
        </div>

        {/* Incoming Requests */}
        <div className="px-5 mb-8">
          <h2 className="text-[16px] font-extrabold text-foreground mb-4 tracking-tight">Incoming Direct Requests</h2>
          {!isOnline ? (
            <div className="bg-[#F8FAFC] border-2 border-dashed border-[#E2E8F0] rounded-[24px] p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                <Power size={24} className="text-muted-foreground" />
              </div>
              <p className="text-[15px] font-extrabold text-foreground">You are currently offline</p>
              <p className="text-[13px] text-muted-foreground mt-2 font-medium">Go online to receive direct requests.</p>
            </div>
          ) : isBusy ? (
            <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-[24px] p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <p className="text-[15px] font-extrabold text-amber-800">You are currently busy</p>
              <p className="text-[13px] text-amber-700 mt-2 font-medium">Finish your active job to receive new requests.</p>
            </div>
          ) : pending.length === 0 ? (
            <EmptyState icon={Inbox} title="No new requests" description="Direct requests will appear here." />
          ) : (
            <div className="space-y-4">
              {pending.map((r) => {
                const service = getServiceById(r.serviceId);
                return (
                  <div
                    key={r.id}
                    className="bg-white border-2 border-transparent hover:border-primary/10 rounded-[24px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-[16px] bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                        {service && <service.icon size={20} className="text-white" strokeWidth={2} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-extrabold text-foreground tracking-tight">{r.customerName}</p>
                        <p className="text-[11px] font-black text-primary uppercase tracking-widest mt-0.5">{service?.label} · ₹{r.price}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-[12px] font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1.5 bg-[#F8FAFC] px-2 py-1 rounded-md"><MapPin size={12} /> {r.address}</span>
                          <span className="flex items-center gap-1.5 bg-[#F8FAFC] px-2 py-1 rounded-md"><Calendar size={12} /> {r.date}</span>
                          <span className="flex items-center gap-1.5 bg-[#F8FAFC] px-2 py-1 rounded-md"><Clock size={12} /> {r.time}</span>
                        </div>
                        {r.notes && <p className="text-[12px] text-foreground mt-3 italic font-medium border-l-2 border-primary/20 pl-3">"{r.notes}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-5">
                      <button
                        onClick={() => {

                          // Account Frozen Check
                          if (isFrozen) {
                            alert(
                              "Account Frozen. Clear outstanding commission dues before accepting new jobs."
                            );
                            return;
                          }

                          // Quick Fix Lock Check
                          // Quick Fix Lock Check
                          if (hasPaymentPendingJob) {

                            if (r.jobType === "scheduled") {

                              const now = new Date();

                              const scheduledTime = new Date(
                                `${r.date} ${r.time}`
                              );

                              const hoursDiff =
                                (scheduledTime.getTime() - now.getTime()) /
                                (1000 * 60 * 60);

                              if (hoursDiff < 6) {
                                alert(
                                  "Scheduled jobs must be at least 6 hours away from your current active job."
                                );
                                return;
                              }

                            } else {

                              alert(
                                "Complete payment collection for your current Quick Fix job before accepting another one."
                              );
                              return;
                            }
                          }

                          // Accept Job
                          socket.emit("update_job_status", {
                            jobId: r.id,
                            status: "accepted"
                          });

                          dispatch({
                            type: "ACCEPT_REQUEST",
                            id: r.id
                          });

                          navigate(`/provider/job/${r.id}`);
                        }}
                        disabled={
                          isFrozen ||
                          (
                            hasPaymentPendingJob &&
                            r.jobType !== "scheduled"
                          )
                        } className={`flex-1 py-3 rounded-[16px] text-[13px] font-bold flex items-center justify-center gap-2 shadow-md transition-all
    ${isFrozen ||
                            (
                              hasPaymentPendingJob &&
                              r.jobType !== "scheduled"
                            )
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-primary text-white shadow-primary/20"
                          }
  `}
                      >
                        <Check size={16} strokeWidth={2.5} />
                        {
                          isFrozen
                            ? "Account Frozen"
                            : hasPaymentPendingJob && r.jobType !== "scheduled"
                              ? "Payment Pending"
                              : "Accept"
                        }
                      </button>
                      <button
                        onClick={() => setSelectedJob(r)}
                        className="flex-1 py-3 rounded-[16px] bg-[#F8FAFC] text-foreground text-[13px] font-bold flex items-center justify-center gap-2"
                      >
                        <Eye size={16} strokeWidth={2.5} /> Details
                      </button>
                      <button
                        onClick={() => {
                          dispatch({ type: "REJECT_REQUEST", id: r.id });
                        }}
                        className="flex-1 py-3 rounded-[16px] bg-red-50 text-red-600 text-[13px] font-bold flex items-center justify-center gap-2"
                      >
                        <X size={16} strokeWidth={2.5} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Bookings */}
        {accepted.length > 0 && (
          <div className="px-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-extrabold text-foreground tracking-tight">Upcoming Bookings</h2>
              <button className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                See all <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
            <div className="space-y-4">
              {accepted.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/provider/job/${r.id}`)}
                  className="w-full bg-primary rounded-[24px] p-5 text-left shadow-[0_8px_30px_rgba(21,46,75,0.2)] flex items-center justify-between relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[20px] pointer-events-none group-hover:bg-white/10 transition-colors duration-500" />
                  <div className="relative z-10">
                    <p className="text-[12px] font-bold text-primary-foreground/70 mb-1">{r.date} at {r.time}</p>
                    <p className="text-[18px] font-extrabold text-white tracking-tight">{getServiceById(r.serviceId)?.label}</p>
                    <p className="text-[13px] font-medium text-white/90 mt-2 flex items-center gap-2">
                      <User size={14} /> {r.customerName}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative z-10 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                    <ChevronRight size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="px-5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-extrabold text-foreground tracking-tight">Recent Activity</h2>
          </div>
          <div className="bg-white border-2 border-transparent rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            {completedJobs.slice(0, 3).map((job, idx) => {
              const service = getServiceById(job.serviceId);

              return (
                <div key={job.id} className={`p-5 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors cursor-pointer ${idx !== 0 ? 'border-t-2 border-[#F8FAFC]' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[16px] bg-emerald-50 flex items-center justify-center">
                      <Check size={20} className="text-emerald-500" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[15px] font-extrabold text-foreground tracking-tight">{service?.label || "Service Completed"}</p>
                      <p className="text-[12px] font-bold text-muted-foreground mt-0.5">{job.date || 'Today'}</p>
                    </div>
                  </div>
                  <p className="text-[16px] font-black text-emerald-600">+₹{formatRupees(Number(job.price) || 0)}</p>
                </div>
              );
            })}
            {completedJobs.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-[14px] font-bold text-muted-foreground">No recent activity yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Window for Job Details */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setSelectedJob(null)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-card sticky top-0 z-10">
              <h2 className="text-lg font-bold text-foreground">Job Details</h2>
              <button onClick={() => setSelectedJob(null)} className="p-1 rounded-full hover:bg-muted transition-colors">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 pb-20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                  {selectedJob.customerName.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">{selectedJob.customerName}</p>
                  <p className="text-xs text-muted-foreground">{getServiceById(selectedJob.serviceId)?.label}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-input rounded-xl p-3 shadow-sm border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><Calendar size={12} /> Date</p>
                  <p className="text-sm font-semibold text-foreground">{selectedJob.date}</p>
                </div>
                <div className="bg-input rounded-xl p-3 shadow-sm border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><Clock size={12} /> Time</p>
                  <p className="text-sm font-semibold text-foreground">{selectedJob.time}</p>
                </div>
              </div>

              <div className="bg-input rounded-xl p-3 shadow-sm border border-border/50">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><MapPin size={12} /> Address</p>
                <p className="text-sm font-semibold text-foreground">{selectedJob.address}</p>
              </div>

              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 shadow-sm">
                <p className="text-[10px] text-emerald-600 uppercase font-bold mb-1 flex items-center gap-1"><Wallet size={12} /> Earnings</p>
                <p className="text-xl font-extrabold text-emerald-700">₹{selectedJob.price}</p>
              </div>

              {selectedJob.notes && (
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 shadow-sm">
                  <p className="text-[10px] text-orange-600 uppercase font-bold mb-1 flex items-center gap-1"><FileText size={12} /> Notes from Customer</p>
                  <p className="text-xs text-orange-900 italic leading-relaxed">"{selectedJob.notes}"</p>
                </div>
              )}

              {/* Attachments Section */}
              {(selectedJob.photos?.length > 0 || selectedJob.video || selectedJob.voiceNote) ? (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 mt-2">Attachments provided</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {selectedJob.photos?.map((photo: string, idx: number) => (
                      <div key={idx} className="w-24 h-24 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center border border-border shadow-sm overflow-hidden relative">
                        <img src={photo} alt="Issue" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {selectedJob.video && (
                      <div className="w-24 h-24 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center border border-border relative shadow-sm overflow-hidden">
                        <Video size={24} className="text-muted-foreground/60 z-10" />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-20">
                          <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                            <Play size={14} className="text-white fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedJob.voiceNote && selectedJob.voiceNoteUrl && (
                      <div className="w-full bg-primary/5 rounded-xl p-3 border border-primary/10 flex flex-col gap-2 shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider">
                          <Mic size={14} /> Voice Note
                        </div>
                        <audio
                          src={selectedJob.voiceNoteUrl}
                          controls
                          className="w-full h-8"
                          onError={(e) => {
                            console.error("Audio playback error:", e);
                            (e.target as any).insertAdjacentHTML('afterend', '<p class="text-[9px] text-red-500 font-bold mt-1">Error loading audio</p>');
                          }}
                        />
                      </div>
                    )}
                    {selectedJob.voiceNote && !selectedJob.voiceNoteUrl && (
                      <div className="w-32 h-24 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center border border-border flex-col gap-1 shadow-sm">
                        <Mic size={20} className="text-muted-foreground/60" />
                        <span className="text-[10px] text-muted-foreground font-semibold">Voice Note</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-3 mt-2">Attachments provided</h3>
                  <p className="text-xs text-muted-foreground">No attachments provided.</p>
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border flex gap-2 bg-card">
              <button
                onClick={() => {
                  dispatch({ type: "REJECT_REQUEST", id: selectedJob.id });
                  setSelectedJob(null);
                }}
                className="flex-1 py-3.5 rounded-xl bg-input border border-border text-foreground text-sm font-bold active:scale-95 transition-transform"
              >
                Reject
              </button>
              <button
                onClick={() => {

                  if (isFrozen) {
                    alert("Account frozen. Clear dues first.");
                    return;
                  }

                  if (hasPaymentPendingJob) {
                    alert(
                      "Complete pending payment before accepting another Quick Fix."
                    );
                    return;
                  }

                  socket.emit("update_job_status", {
                    jobId: selectedJob.id,
                    status: "accepted"
                  });

                  dispatch({
                    type: "ACCEPT_REQUEST",
                    id: selectedJob.id
                  });

                  navigate(`/provider/job/${selectedJob.id}`);
                }}
                disabled={isFrozen} className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-transform
    ${isFrozen || hasPaymentPendingJob
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-primary text-primary-foreground shadow-md"
                  }
  `}
              >
                {isFrozen
                  ? "Account Frozen"
                  : hasPaymentPendingJob
                    ? "Payment Pending"
                    : "Accept Job"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Direct Request Popup (Top-aligned) */}
      {(simulatedRequest || activeDirectRequest) && (
        <IncomingRequestPopup
          request={simulatedRequest || activeDirectRequest}
          isBroadcast={false}
          isBusy={isBusy}
          onAccept={() => {
            const req = simulatedRequest || activeDirectRequest;
            socket.emit("update_job_status", { jobId: req.id, status: "accepted" });
            dispatch({ type: "ACCEPT_REQUEST", id: req.id });
            if (simulatedRequest) setSimulatedRequest(null);
            if (activeDirectRequest) setActiveDirectRequest(null);
            navigate(`/provider/job/${req.id}`);
          }}
          onReject={() => {
            const req = simulatedRequest || activeDirectRequest;
            dispatch({ type: "REJECT_REQUEST", id: req.id });
            if (simulatedRequest) setSimulatedRequest(null);
            if (activeDirectRequest) setActiveDirectRequest(null);
          }}
        />
      )}

      {/* Live Job Broadcast Popup removed — activeBroadcast handles all broadcasts directly
           via socket, avoiding duplicate popups from liveBroadcasts context state */}

      {/* Quote Modal */}
      {quotingBroadcast && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center px-4 animate-fade-in backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-[320px] rounded-2xl p-5 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-foreground mb-1">Submit Your Quote</h3>
            <p className="text-xs text-muted-foreground mb-4">Customer: {quotingBroadcast.customerName}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Your Price (₹)</label>
                <input
                  type="number"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  placeholder="e.g. 450"
                  className="w-full h-11 bg-muted border border-border rounded-xl px-3 font-medium text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Estimated Arrival (Mins)</label>
                <input
                  type="number"
                  value={quoteEta}
                  onChange={(e) => setQuoteEta(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full h-11 bg-muted border border-border rounded-xl px-3 font-medium text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setQuotingBroadcast(null)}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-bold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitQuote}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md"
              >
                Send Quote
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
