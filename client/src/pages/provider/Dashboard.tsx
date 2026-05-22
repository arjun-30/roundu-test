import { useState, useEffect, useRef } from "react";
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
import ProviderBottomNav from "@/components/ProviderBottomNav";
import IncomingRequestPopup from "@/components/IncomingRequestPopup";
import PIPModal from "@/components/PIPModal";
import LocationModal from "@/components/LocationModal";
import { socket } from "@/lib/socket";
import { useCurrentLocation } from "@/hooks/useLocation";
import { reverseGeocode } from "@/lib/mapProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback } from "react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { providerRequests, completedJobs, dispatch, user, isOnline, providerStats, liveBroadcasts, notifications, quotedBroadcasts } = useApp() as any;

  // Sync role to provider on mount
  useEffect(() => {
    dispatch({ type: "SET_ROLE", role: "provider" });
  }, [dispatch]);
  const [showWarning, setShowWarning] = useState(true);
  const [selectedJob, setSelectedJob] = useState<ProviderRequest | null>(null);
  const [simulatedRequest, setSimulatedRequest] = useState<ProviderRequest | null>(null);

  const [locating, setLocating] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [quotingBroadcast, setQuotingBroadcast] = useState<any | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteEta, setQuoteEta] = useState("15");

  const [showPip, setShowPip] = useState(false);
  const [pipType, setPipType] = useState<"new_signup" | "low_rating" | null>(null);
  const isCritical = providerStats.rating < 4.0 || (providerStats.responseRate > 0 && providerStats.responseRate < 50);

  const [activeDirectRequest, setActiveDirectRequest] = useState<any | null>(null);
  // ✅ Direct local broadcast state — bypasses AppContext context re-render issues
  const [activeBroadcast, setActiveBroadcast] = useState<any | null>(null);
  // Use sessionStorage to persist seen IDs across re-renders/reconnects within same session
  const seenBroadcastIds = useRef(new Set<string>(
    JSON.parse(sessionStorage.getItem("seen_broadcast_ids") || "[]")
  ));

  const pending = providerRequests.filter((r) => r.status === "pending");
  const accepted = providerRequests.filter((r) => r.status === "accepted" || r.status === "assigned" || r.status === "in_progress" || r.status === "on_the_way" || r.status === "arrived");
  const earnings = completedJobs.reduce((s, j) => s + j.price, 0);

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

    if (["in_progress", "on_the_way", "arrived"].includes(r.status)) {
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
    dispatch({ type: "SET_ONLINE", value: !isOnline });
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
        const shortAddr = result.area
          ? `${result.area}${result.city ? ", " + result.city : ""}`
          : result.address.split(",").slice(0, 2).join(",");
        dispatch({ type: "UPDATE_USER", user: { address: shortAddr } });
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
      console.log("[Dashboard] 📡 incoming_broadcast received locally:", broadcast.broadcastId);
      if (seenBroadcastIds.current.has(broadcast.broadcastId)) return; // deduplicate

      // 🕐 Reject stale broadcasts — if older than 120 seconds, ignore silently
      const POPUP_TTL_MS = 120 * 1000;
      const broadcastAge = Date.now() - (broadcast.createdAt || 0);
      if (broadcastAge > POPUP_TTL_MS) {
        console.log("[Dashboard] ⏰ Broadcast expired, skipping:", broadcast.broadcastId);
        seenBroadcastIds.current.add(broadcast.broadcastId); // mark as seen so it won't show later
        const updated = Array.from(seenBroadcastIds.current);
        sessionStorage.setItem("seen_broadcast_ids", JSON.stringify(updated));
        return;
      }

      seenBroadcastIds.current.add(broadcast.broadcastId);
      const updated = Array.from(seenBroadcastIds.current);
      sessionStorage.setItem("seen_broadcast_ids", JSON.stringify(updated));
      setActiveBroadcast(broadcast);
    };
    socket.on("incoming_broadcast", handleBroadcast);
    return () => { socket.off("incoming_broadcast", handleBroadcast); };
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (providerStats.rating === 0) {
      const hasSeenNewSignup = localStorage.getItem("has_seen_new_signup");
      if (!hasSeenNewSignup) {
        localStorage.setItem("has_seen_new_signup", "true");
        setPipType("new_signup");
        setShowPip(true);
      }
    } else {
      if (providerStats.rating < 3.5) {
        localStorage.setItem("is_in_pip", "true");
      } else if (providerStats.rating >= 3.7) {
        localStorage.setItem("is_in_pip", "false");
      }

      const isInPip = localStorage.getItem("is_in_pip") === "true";
      if (isInPip) {
        const lastSeenLowRating = localStorage.getItem("last_seen_low_rating");
        if (lastSeenLowRating !== today) {
          localStorage.setItem("last_seen_low_rating", today);
          setPipType("low_rating");
          setShowPip(true);
        }
      }
    }
  }, [providerStats.rating]);

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

    socket.emit("submit_quote", {
      broadcastId: quotingBroadcast.broadcastId,
      customerId: quotingBroadcast.customerId,
      providerId: user.id,
      providerName: user.name,
      providerAvatar: user.name.charAt(0),
      providerPhone: user.phone || "9999999992",
      price: Number(quotePrice),
      rating: providerStats.rating || 0,
      distanceKm: 0,
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
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24 relative provider-theme">
      {/* PIP Modal */}
      {showPip && pipType && (
        <PIPModal
          type={pipType}
          rating={providerStats.rating}
          onClose={pipType === "low_rating" ? () => {
            const today = new Date().toISOString().slice(0, 10);
            localStorage.setItem("last_seen_low_rating", today);
            setShowPip(false);
          } : undefined}
          onCommit={() => {
            if (pipType === "new_signup") {
              localStorage.setItem("has_seen_new_signup", "true");
            } else {
              const today = new Date().toISOString().slice(0, 10);
              localStorage.setItem("last_seen_low_rating", today);
            }
            setShowPip(false);
          }}
        />
      )}

      {/* ✅ Incoming Broadcast Popup — uses local socket state (bypasses context issue) */}
      {activeBroadcast && !quotingBroadcast && !(quotedBroadcasts && quotedBroadcasts.includes(activeBroadcast.broadcastId)) && (
        <IncomingRequestPopup
          request={activeBroadcast}
          isBroadcast={true}
          onAccept={() => setQuotingBroadcast(activeBroadcast)}
          onReject={() => {
            // Remove from both local state AND liveBroadcasts context
            dispatch({ type: "REMOVE_LIVE_BROADCAST", id: activeBroadcast.broadcastId });
            setActiveBroadcast(null);
          }}
        />
      )}

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-5 pt-3 pb-4 flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm"
      >
        <div>
          <p className="text-xs text-muted-foreground font-bold tracking-wide uppercase">Provider Dashboard</p>
          <h1 className="text-[22px] font-extrabold text-foreground mt-0.5 tracking-tight">Hi, {user.name.split(" ")[0]}</h1>
          <button 
            onClick={() => setIsLocationModalOpen(true)}
            className="group flex items-center gap-1.5 mt-1 cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <MapPin size={10} className="text-primary group-hover:text-accent transition-colors" />
            </div>
            <p className="text-[12px] font-bold text-muted-foreground group-hover:text-primary transition-colors line-clamp-1 max-w-[150px]">
              {locating || gpsLoading ? (
                <span className="flex items-center gap-1">
                  <span className="animate-spin text-primary">⚙️</span> Detecting...
                </span>
              ) : (
                user.address || "Set Location"
              )}
            </p>
          </button>
        </div>
        <div className="flex gap-3 items-center">
          {/* Online/Offline Toggle */}
          <div className="flex flex-col items-center gap-1 mt-1">
            <button
              disabled={isBusy}
              onClick={toggleOnline}
              className={`w-[52px] h-7 rounded-full p-1 transition-all flex items-center shadow-inner ${isOnline ? 'bg-success border-success/20' : 'bg-[#E2E8F0] border-transparent'} border-2 ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isOnline ? 'translate-x-[20px]' : 'translate-x-0'}`} />
            </button>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isOnline ? 'text-success' : 'text-muted-foreground'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/provider/profile")}
              className="w-[42px] h-[42px] rounded-[14px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center transition-all shadow-sm"
              title="Provider Profile"
            >
              <User size={20} className="text-primary" strokeWidth={2.5} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/notifications")}
              className="w-[42px] h-[42px] rounded-[14px] bg-[#F8FAFC] border-2 border-transparent hover:border-primary/10 flex items-center justify-center relative transition-all shadow-sm"
              title="Notifications"
            >
              <Bell size={20} className="text-primary" strokeWidth={2.5} />
              {(pending.length > 0 || notifications.length > 0) && (
                <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto pb-6"
      >
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
            if ((providerStats.rating > 0 && providerStats.rating < 3.7) || (providerStats.responseRate > 0 && providerStats.responseRate < 50)) {
              warning = {
                type: "critical",
                title: "Account at Risk",
                message: "Your performance is critically low. Please improve immediately to avoid permanent deactivation.",
                bg: "bg-[#FEF2F2]",
                border: "border-[#FECACA]",
                text: "text-[#991B1B]",
                subtext: "text-[#B91C1C]",
                iconColor: "text-[#EF4444]",
                iconBg: "bg-[#FEE2E2]"
              };
            } else if (providerStats.responseRate > 0 && providerStats.responseRate < 90) {
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
            } else if (providerStats.rating > 0 && providerStats.rating < 4.5) {
              warning = {
                type: "caution",
                title: "Rating Dropping",
                message: `Your rating is ${providerStats.rating}. Try to provide better service to get 5-star reviews.`,
                bg: "bg-[#FEFCE8]",
                border: "border-[#FEF08A]",
                text: "text-[#854D0E]",
                subtext: "text-[#A16207]",
                iconColor: "text-[#EAB308]",
                iconBg: "bg-[#FEF9C3]"
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
          <motion.div variants={itemVariants} className="px-5 mb-6 mt-4">
            <h2 className="text-[16px] font-extrabold text-foreground mb-3 flex items-center gap-2 tracking-tight">
              <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              Live Job Requests
            </h2>
            <div className="space-y-4">
              {liveBroadcasts.map((b) => {
                const service = getServiceById(b.serviceId);
                const isQuoted = b.status === "waiting_for_customer" || (quotedBroadcasts && quotedBroadcasts.includes(b.broadcastId));
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
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
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isBusy}
                                onClick={() => setQuotingBroadcast(b)}
                                className={`flex-1 py-3 rounded-[16px] text-[13px] font-bold shadow-md ${
                                  isBusy ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60 shadow-none' : 'bg-accent text-white shadow-accent/20'
                                }`}
                              >
                                Provide Quote
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => dispatch({ type: "REMOVE_LIVE_BROADCAST", id: b.broadcastId })}
                                className="px-4 py-3 border-2 border-transparent hover:border-[#FDE68A] text-[#B45309] rounded-[16px] text-[13px] font-bold bg-[#FEF3C7]"
                              >
                                Skip
                              </motion.button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="px-5 mb-6 mt-4">
          <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-5 px-5">
            <motion.div whileHover={{ y: -2 }} className="bg-white border-2 border-transparent hover:border-emerald-500/20 rounded-[24px] p-5 min-w-[140px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex-shrink-0 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg">
                <Wallet size={14} strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-widest font-black">Earnings</span>
              </div>
              <p className="text-[24px] font-black text-foreground tracking-tight">₹{earnings}</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Earned Today</p>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-white border-2 border-transparent hover:border-primary/20 rounded-[24px] p-5 min-w-[140px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex-shrink-0 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-primary bg-primary/10 w-fit px-2.5 py-1 rounded-lg">
                <Briefcase size={14} strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-widest font-black">Completed</span>
              </div>
              <p className="text-[24px] font-black text-foreground tracking-tight">{completedJobs.length}</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Total Jobs</p>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-white border-2 border-transparent hover:border-accent/20 rounded-[24px] p-5 min-w-[140px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex-shrink-0 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-accent bg-accent/10 w-fit px-2.5 py-1 rounded-lg">
                <Star size={14} fill="currentColor" strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-widest font-black">Rating</span>
              </div>
              <p className="text-[24px] font-black text-foreground tracking-tight">{providerStats.rating}</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Out of 5.0</p>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} className="bg-white border-2 border-transparent hover:border-emerald-500/20 rounded-[24px] p-5 min-w-[140px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex-shrink-0 transition-colors">
              <div className="flex items-center gap-2 mb-3 text-emerald-600 bg-emerald-50 w-fit px-2.5 py-1 rounded-lg">
                <TrendingUp size={14} strokeWidth={2.5} />
                <span className="text-[10px] uppercase tracking-widest font-black">Response</span>
              </div>
              <p className="text-[24px] font-black text-foreground tracking-tight">{providerStats.responseRate}%</p>
              <p className="text-[11px] font-bold text-muted-foreground mt-0.5">Acceptance Rate</p>
            </motion.div>
          </div>
        </motion.div>

        {/* AI Tip Card */}
        <motion.div variants={itemVariants} className="px-5 mb-6">
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
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="px-5 mb-8">
          <h2 className="text-[16px] font-extrabold text-foreground mb-4 tracking-tight">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/provider/earnings')}
              className="bg-white rounded-[24px] p-5 flex flex-col items-start gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-2 border-transparent hover:border-emerald-500/10 transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-[16px] bg-[#F8FAFC] flex items-center justify-center text-emerald-500">
                <Wallet size={24} strokeWidth={2} />
              </div>
              <div>
                <p className="text-[14px] font-extrabold text-foreground tracking-tight">My Earnings</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-0.5">₹{earnings} earned</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
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
            </motion.button>
          </div>
        </motion.div>

        {/* Incoming Requests */}
        <motion.div variants={itemVariants} className="px-5 mb-8">
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
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
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
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          socket.emit("update_job_status", { jobId: r.id, status: "accepted" });
                          dispatch({ type: "ACCEPT_REQUEST", id: r.id });
                          navigate(`/provider/job/${r.id}`);
                        }}
                        className="flex-1 py-3 rounded-[16px] bg-primary text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                      >
                        <Check size={16} strokeWidth={2.5} /> Accept
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedJob(r)}
                        className="flex-1 py-3 rounded-[16px] bg-[#F8FAFC] text-foreground text-[13px] font-bold flex items-center justify-center gap-2"
                      >
                        <Eye size={16} strokeWidth={2.5} /> Details
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          dispatch({ type: "REJECT_REQUEST", id: r.id });
                        }}
                        className="flex-1 py-3 rounded-[16px] bg-red-50 text-red-600 text-[13px] font-bold flex items-center justify-center gap-2"
                      >
                        <X size={16} strokeWidth={2.5} /> Reject
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Upcoming Bookings */}
        {accepted.length > 0 && (
          <motion.div variants={itemVariants} className="px-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-extrabold text-foreground tracking-tight">Upcoming Bookings</h2>
              <button className="text-[12px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                See all <ChevronRight size={14} strokeWidth={2.5} />
              </button>
            </div>
            <div className="space-y-4">
              {accepted.map((r) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="px-5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-extrabold text-foreground tracking-tight">Recent Activity</h2>
          </div>
          <div className="bg-white border-2 border-transparent rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
            {completedJobs.slice(0, 3).map((job, idx) => {
              const req = providerRequests.find(r => r.id === job.id);
              const service = req ? getServiceById(req.serviceId) : null;

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
                  <p className="text-[16px] font-black text-emerald-600">+₹{job.price}</p>
                </div>
              );
            })}
            {completedJobs.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-[14px] font-bold text-muted-foreground">No recent activity yet.</p>
              </div>
            )}
          </div>
        </motion.div>

      </motion.div>

      <ProviderBottomNav />

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
                  socket.emit("update_job_status", { jobId: selectedJob.id, status: "accepted" });
                  dispatch({ type: "ACCEPT_REQUEST", id: selectedJob.id });
                  navigate(`/provider/job/${selectedJob.id}`);
                }}
                className="flex-1 py-3.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform shadow-md"
              >
                Accept Job
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 animate-fade-in backdrop-blur-sm">
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
