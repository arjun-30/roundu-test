import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Phone, MessageCircle, ChevronRight, Star } from "lucide-react";
import { useApp, ProviderQuote } from "@/context/AppContext";
import { socket } from "@/lib/socket";
import { createBooking } from "@/lib/api";
import { useCurrentLocation } from "@/hooks/useLocation";

/**
 * 🎨 DESIGN SYSTEM & SPEC-DRIVEN
 */

const SECONDARY_STATUS_MESSAGES = [
  "Scanning your area...",
  "Matching best experts...",
  "Checking availability...",
  "Almost there...",
  "Verifying credentials...",
  "Calculating distance..."
];

const INITIALS_POOL = ["RK", "VM", "AS", "PL", "SN", "TR", "MB"];

interface ProviderDot {
  id: number;
  initials: string;
  angle: number;
  distance: number;
  startTime: number;
  duration: number;
}

interface CachedSearchState {
  serviceId: string;
  broadcastId: string;
  statusIndex: number;
  activeDotIndex: number;
  isLongWait: boolean;
}

const getCachedSearchState = (serviceId: string | undefined): CachedSearchState | null => {
  try {
    const cached = sessionStorage.getItem("searching_providers_state");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.serviceId === serviceId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse cached search state", e);
  }
  return null;
};

const SearchingProviders = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const cachedState = getCachedSearchState(serviceId);

  const [dots, setDots] = useState<ProviderDot[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const [statusIndex, setStatusIndex] = useState(() => cachedState?.statusIndex ?? 0);
  const [activeDotIndex, setActiveDotIndex] = useState(() => cachedState?.activeDotIndex ?? 0);
  const [isLongWait, setIsLongWait] = useState(() => cachedState?.isLongWait ?? false);
  const [error, setError] = useState("");
  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(null);

  const { user, nearbyProviders, currentLocation, dispatch, receivedQuotes, bookingNotes, bookingVoiceNoteUrl, bookingVoiceNote, selectedDate, selectedTime } = useApp();
  const isRestoredRef = useRef(!!cachedState);
  const hasTriggered = useRef(!!cachedState);
  const [broadcastId] = useState(() => cachedState?.broadcastId || `bc-${user?.id || 'anon'}-${Date.now()}`);

  // Convert GPS to SVG Coordinates
  const getProviderPos = (lat: number, lng: number) => {
    if (!currentLocation) return { x: 190, y: 170, opacity: 0 };
    
    // Zoom factor: 0.01 degree (~1km) = 100px
    const zoom = 10000; 
    const dx = (lng - currentLocation.lng) * zoom;
    const dy = (currentLocation.lat - lat) * zoom; // SVG Y is down
    
    return {
      x: 190 + dx,
      y: 170 + dy,
      opacity: 1
    };
  };

  // ── GPS: fetch once, store in ref + AppContext ──────────────────────────
  // Use a ref so the broadcast useEffect always reads the LATEST coords
  // even after GPS resolves asynchronously.
  const coordsRef = useRef<{ lat: number; lng: number } | null>(currentLocation);

  const handleLocationUpdate = useCallback((lat: number, lng: number) => {
    coordsRef.current = { lat, lng };
    dispatch({ type: "SET_CURRENT_LOCATION", lat, lng });
  }, [dispatch]);
  useCurrentLocation(handleLocationUpdate);

  // ── Scroll Handling ──────────────────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem("searching_providers_scroll", scrollContainerRef.current.scrollTop.toString());
    }
  };

  // Restore scroll position when quotes are loaded
  useEffect(() => {
    if (receivedQuotes.length > 0 && scrollContainerRef.current) {
      const savedScroll = sessionStorage.getItem("searching_providers_scroll");
      if (savedScroll) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
          }
        }, 50);
      }
    }
  }, [receivedQuotes.length]);

  // ── Dynamic UX Intervals ─────────────────────────────────────────────────
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setActiveDotIndex((prev) => (prev + 1) % 5);
    }, 600);

    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % SECONDARY_STATUS_MESSAGES.length);
    }, 2500);

    const waitTimeout = setTimeout(() => {
      setIsLongWait(true);
    }, 15000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(statusInterval);
      clearTimeout(waitTimeout);
    };
  }, []);

  // ── Derive Found Count ───────────────────────────────────────────────────
  // Only count providers who have actually responded with a quote for this
  // specific broadcast. nearbyProviders is a GPS-tracking map that persists
  // stale entries across sessions and must NOT be used for this count.
  useEffect(() => {
    setFoundCount(receivedQuotes.length);
  }, [receivedQuotes]);

  // ── Save Search State to Caches ──────────────────────────────────────────
  useEffect(() => {
    if (!serviceId) return;
    const stateToCache: CachedSearchState = {
      serviceId,
      broadcastId,
      statusIndex,
      activeDotIndex,
      isLongWait
    };
    sessionStorage.setItem("searching_providers_state", JSON.stringify(stateToCache));
  }, [serviceId, broadcastId, statusIndex, activeDotIndex, isLongWait]);

  // Cache receivedQuotes in sessionStorage
  useEffect(() => {
    if (receivedQuotes.length > 0) {
      sessionStorage.setItem("searching_providers_quotes", JSON.stringify(receivedQuotes));
    }
  }, [receivedQuotes]);

  // ── Broadcast Job ────────────────────────────────────────────────────────
  // Emits broadcast_job immediately (with coords if GPS already resolved)
  // AND re-emits every 5s for late-connecting providers, always using the
  // latest coordsRef value so GPS doesn't need to race the first render.
  useEffect(() => {
    if (isRestoredRef.current) {
      try {
        const cachedQuotes = sessionStorage.getItem("searching_providers_quotes");
        if (cachedQuotes) {
          const parsed = JSON.parse(cachedQuotes);
          parsed.forEach((q: any) => {
            dispatch({ type: "ADD_RECEIVED_QUOTE", quote: q });
          });
        }
      } catch (e) {
        console.error("Failed to restore quotes from cache:", e);
      }
    } else {
      dispatch({ type: "CLEAR_RECEIVED_QUOTES" });
    }

    const buildPayload = () => ({
      broadcastId: broadcastId,
      customerId: user.id,
      customerName: user.name,
      serviceId: serviceId || "electrician",
      address: user.address || "Current Location",
      lat: coordsRef.current?.lat ?? null,
      lng: coordsRef.current?.lng ?? null,
      date: selectedDate || new Date().toISOString().slice(0, 10),
      time: selectedTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: bookingNotes || "Quick fix request from customer",
      voiceNoteUrl: bookingVoiceNoteUrl,
      voiceNote: bookingVoiceNote
    });

    const doEmit = () => {
      if (socket.connected) {
        const payload = buildPayload();
        console.log("[socket] emitting broadcast_job:", payload.serviceId, "lat:", payload.lat, "lng:", payload.lng);
        socket.emit("broadcast_job", payload);
        
        if (!hasTriggered.current) {
          dispatch({ type: "ADD_NOTIFICATION", text: "✅ Booking Submitted Successfully. Searching for nearby professionals..." });
          hasTriggered.current = true;
        }
      }
    };

    // Emit immediately if connected, else wait for connect
    if (socket.connected) {
      doEmit();
    } else {
      socket.once("connect", doEmit);
    }

    // Re-broadcast every 5 seconds for providers with unstable connections
    // Each re-broadcast picks up the latest coordsRef (GPS may have resolved by then)
    const interval = setInterval(doEmit, 5000);

    return () => {
      clearInterval(interval);
      socket.off("connect", doEmit);
    };
  }, [serviceId, user, dispatch, bookingNotes, bookingVoiceNoteUrl, bookingVoiceNote]);

  const handleAcceptQuote = async (quote: ProviderQuote) => {
    if (acceptingQuoteId) return; // Prevent double-clicks
    
    if (!user || !user.id) {
      setError("Please log in to confirm booking");
      setTimeout(() => navigate("/auth", { replace: true }), 1500);
      return;
    }
    setError("");
    setAcceptingQuoteId(quote.providerId);

    const bookingData = {
      customer_id: user.id,
      provider_id: quote.providerId,
      service_id: serviceId,
      status: "assigned",
      scheduled_at: new Date(Date.now() + quote.etaMin * 60000).toISOString(),
      address: user.address || "Client Address",
      lat: currentLocation?.lat,
      lng: currentLocation?.lng,
      price: quote.price,
      notes: bookingNotes || "Quick fix requested",
      voice_note: bookingVoiceNote,
      voice_note_url: bookingVoiceNoteUrl || null,
    };

    try {
      const res = await createBooking(bookingData);
      if (res.success) {
        sessionStorage.removeItem("searching_providers_state");
        sessionStorage.removeItem("searching_providers_scroll");
        sessionStorage.removeItem("searching_providers_quotes");
        const enrichedBooking = {
          ...res.data,
          providerDetails: {
            name: quote.providerName,
            avatar: quote.providerAvatar,
            rating: quote.rating,
            experienceYrs: quote.reviews,
            phone: (quote as any).providerPhone
          }
        };
        dispatch({ type: "ADD_BOOKING", booking: enrichedBooking });
        
        // Notify the winning provider & other providers the job is taken
        socket.emit("accept_quote", { 
          broadcastId: broadcastId, 
          acceptedProviderId: quote.providerId,
          bookingId: res.data.id,
          customerName: user.name,
          customerPhone: user.phone,
          address: user.address || "Customer Location",
          serviceId: serviceId,
          price: quote.price,
          lat: currentLocation?.lat,
          lng: currentLocation?.lng,
          scheduled_at: res.data.scheduled_at,
        });

        navigate(`/chat/${res.data.id}`);
      } else {
        setError("Failed to confirm booking.");
        setAcceptingQuoteId(null);
      }
    } catch (err) {
      console.error(err);
      setError("Error confirming quote. Check your connection.");
      setAcceptingQuoteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-['DM_Sans',sans-serif] overflow-hidden select-none">

      {/* Top Bar */}
      <div className="px-5 pt-6 pb-2 flex items-center gap-4 relative z-20">
        <button
          onClick={() => {
            sessionStorage.removeItem("searching_providers_state");
            sessionStorage.removeItem("searching_providers_scroll");
            sessionStorage.removeItem("searching_providers_quotes");
            navigate(-1);
          }}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-border active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} className="text-primary" />
        </button>
        <h1 className="text-[17px] font-[600] text-foreground">Finding your specialist</h1>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative min-h-[340px] flex items-center justify-center">

        {/* SVG Map Canvas */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            width="380"
            height="340"
            viewBox="0 0 380 340"
            className="w-full h-full max-w-md"
          >
            {/* Background (Landuse) */}
            <rect width="380" height="340" fill="#F1F5F9" />

            {/* Parks / Green spaces */}
            <rect x="20" y="30" width="70" height="45" rx="12" fill="#E2F2E4" opacity="0.8" />
            <rect x="280" y="210" width="85" height="55" rx="14" fill="#E2F2E4" opacity="0.8" />
            <circle cx="60" cy="270" r="25" fill="#E2F2E4" opacity="0.6" />

            {/* River / Waterbody */}
            <path
              d="M-20,90 Q80,120 180,95 T400,105"
              stroke="#CCE1F5"
              strokeWidth="24"
              fill="none"
              opacity="0.65"
              strokeLinecap="round"
            />

            {/* Grid Lines (Subtle Overlay) */}
            <g stroke="#E2E8F0" strokeWidth="0.5" strokeDasharray="3,3">
              {[...Array(13)].map((_, i) => (
                <line key={`v-${i}`} x1={i * 30 + 10} y1="0" x2={i * 30 + 10} y2="340" />
              ))}
              {[...Array(12)].map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={i * 30 + 10} x2="380" y2={i * 30 + 10} />
              ))}
            </g>

            {/* Secondary Streets */}
            <path d="M40,-10 C80,150 300,190 330,350" stroke="#E2E8F0" strokeWidth="4" fill="none" />
            <path d="M40,-10 C80,150 300,190 330,350" stroke="white" strokeWidth="2.5" fill="none" />

            <path d="M310,-10 Q280,120 40,240" stroke="#E2E8F0" strokeWidth="3" fill="none" />
            <path d="M310,-10 Q280,120 40,240" stroke="white" strokeWidth="1.5" fill="none" />

            {/* Primary Highway 1 (Horizontal) */}
            <path d="M-10,170 Q190,170 390,170" stroke="#D8E2ED" strokeWidth="8" fill="none" />
            <path d="M-10,170 Q190,170 390,170" stroke="white" strokeWidth="6" fill="none" />

            {/* Primary Highway 2 (Vertical) */}
            <path d="M190,-10 Q190,170 190,350" stroke="#D8E2ED" strokeWidth="8" fill="none" />
            <path d="M190,-10 Q190,170 190,350" stroke="white" strokeWidth="6" fill="none" />

            {/* Concentric Distance Rings */}
            <circle cx="190" cy="170" r="55" fill="none" stroke="#3B82F6" strokeWidth="0.8" strokeOpacity="0.15" strokeDasharray="3,3" />
            <circle cx="190" cy="170" r="110" fill="none" stroke="#3B82F6" strokeWidth="0.8" strokeOpacity="0.15" strokeDasharray="3,3" />
            <circle cx="190" cy="170" r="160" fill="none" stroke="#3B82F6" strokeWidth="0.8" strokeOpacity="0.15" strokeDasharray="3,3" />

            {/* Radar Distance Labels */}
            <text x="190" y="110" textAnchor="middle" fill="#94A3B8" fontSize="7" fontWeight="bold" opacity="0.8">250m</text>
            <text x="190" y="55" textAnchor="middle" fill="#94A3B8" fontSize="7" fontWeight="bold" opacity="0.8">500m</text>

            {/* Gradients & Filters */}
            <defs>
              <linearGradient id="sweep-line-glow" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#2563EB" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="sweep-sector-glow" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* Rotating Radar Sweeper */}
            <g className="origin-[190px_170px] animate-radar-sweep">
              <line x1="190" y1="170" x2="190" y2="20" stroke="url(#sweep-line-glow)" strokeWidth="2.5" />
              <path d="M190,170 L190,20 A150,150 0 0,1 296,64 Z" fill="url(#sweep-sector-glow)" opacity="0.2" />
            </g>

            {/* Center Beacon Glow & Pulse */}
            <circle cx="190" cy="170" r="28" fill="#3B82F6" fillOpacity="0.04" className="animate-pulse" />
            <circle cx="190" cy="170" r="16" fill="#3B82F6" fillOpacity="0.08" />

            <circle cx="190" cy="170" r="8" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeOpacity="0.5">
              <animate attributeName="r" from="8" to="40" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.8" to="0" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="190" cy="170" r="8" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeOpacity="0.5">
              <animate attributeName="r" from="8" to="40" dur="2.5s" begin="1.25s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.8" to="0" dur="2.5s" begin="1.25s" repeatCount="indefinite" />
            </circle>

            {/* Core Center Beacon Point */}
            <circle cx="190" cy="170" r="5" fill="#2563EB" stroke="white" strokeWidth="2" className="shadow-md" />
          </svg>
        </div>

        {/* Found Counter Badge (Top Right) */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md border border-slate-100 py-1.5 px-3.5 rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.05)] z-10 animate-fade-in flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${foundCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-[11px] font-black text-primary uppercase tracking-wider">
            {foundCount > 0 ? `${foundCount} pros found` : 'Searching...'}
          </span>
        </div>

        {/* Floating Provider Dots Layer (REAL TIME) */}
        <div className="absolute inset-0 pointer-events-none" style={{ perspective: '1000px' }}>
          {Object.values(nearbyProviders).map((p) => {
            const pos = getProviderPos(p.lat, p.lng);
            return (
              <div
                key={p.id}
                className="absolute transition-all duration-500"
                style={{
                  top: `${pos.y}px`,
                  left: `${pos.x}px`,
                  opacity: pos.opacity,
                  transform: `translate(-50%, -50%)`
                }}
              >
                <div className="flex flex-col items-center relative">
                  {/* Ping Ring Effect */}
                  <span className="absolute -inset-1.5 rounded-full bg-primary/20 animate-ping opacity-60 pointer-events-none" />

                  {/* Avatar Container */}
                  <div className="relative w-10 h-10 rounded-full bg-white p-[2px] shadow-[0_8px_20px_rgba(0,0,0,0.12)] border border-slate-100 z-10 transition-all duration-300 hover:scale-110">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary to-primary/80 flex items-center justify-center font-bold text-white text-xs">
                        {p.name?.charAt(0) || "P"}
                      </div>
                    )}
                    {/* Green online badge */}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>

                  {/* Mini Name Label */}
                  <div className="bg-white/95 backdrop-blur-sm border border-slate-100 text-foreground text-[8px] font-black px-2 py-0.5 rounded-full mt-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] z-10 flex items-center gap-1">
                    <span className="max-w-[50px] truncate">{p.name?.split(" ")[0]}</span>
                    <span className="text-[7px] text-yellow-500 flex items-center font-extrabold">★</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.04)] px-6 pt-3 pb-8 relative z-20 transition-transform">
        <div className="w-[36px] h-1.5 bg-[#E1E8EF] rounded-full mx-auto mb-6" />

        {error && <div className="text-red-500 text-sm font-semibold text-center mb-4">{error}</div>}

        <div className="flex flex-col items-center text-center">

          {foundCount >= 3 && (foundCount % 3 === 0 || foundCount % 3 === 1) && (
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-1.5 rounded-full mb-4 animate-badge-up">
              <span className="text-[13px] font-[600] text-[#166534]">{foundCount} professionals found</span>
            </div>
          )}

          <h2 className="text-[18px] font-[600] text-foreground mb-1.5">Finding nearby professionals</h2>

          <div className="h-6 flex items-center justify-center overflow-hidden w-full relative mb-4">
            <p
              key={statusIndex + (isLongWait ? 'wait' : '')}
              className="text-[13px] text-[#7A8BA0] font-[400] animate-status-fade absolute"
            >
              {receivedQuotes.length > 0 
                ? "Providers are responding..." 
                : (isLongWait ? "Still searching for the best providers near you..." : SECONDARY_STATUS_MESSAGES[statusIndex])}
            </p>
          </div>

          {/* Received Quotes Section */}
          {receivedQuotes.length > 0 ? (
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="w-full flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto no-scrollbar"
            >
              {receivedQuotes
                .filter((q) => !acceptingQuoteId || q.providerId === acceptingQuoteId)
                .map((q) => (
                <div 
                  key={q.providerId} 
                  onClick={() => !acceptingQuoteId && navigate(`/provider/${q.providerId}`, { state: { quote: q } })}
                  className="bg-white border border-[#E1E8EF] rounded-2xl p-4 flex flex-col gap-3 text-left shadow-sm animate-badge-up cursor-pointer active:scale-[0.98] transition-transform hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!acceptingQuoteId) navigate(`/provider/${q.providerId}`, { state: { quote: q } });
                        }}
                        className="w-12 h-12 rounded-full bg-[#F5F8FB] flex items-center justify-center font-bold text-primary border border-[#E1E8EF] hover:border-primary transition-colors"
                      >
                        {q.providerAvatar}
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-foreground">{q.providerName}</h4>
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground mt-0.5">
                          {q.rating === 0 ? (
                            <span className="flex items-center gap-0.5 text-yellow-600 bg-yellow-100 px-1 py-0.5 rounded font-bold uppercase text-[10px]">New</span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-yellow-500 font-bold"><Star size={12} className="fill-yellow-500 text-yellow-500" /> {q.rating}</span>
                          )}
                          <span>• {q.distanceKm}km away</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-extrabold text-primary">₹{q.price}</p>
                      <p className="text-[10px] text-green-600 font-[600] bg-green-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">ETA: {q.etaMin} mins</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                       <button disabled className="w-8 h-8 rounded-full bg-secondary/5 flex items-center justify-center text-secondary/40">
                          <Phone size={14} />
                       </button>
                       <button disabled className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary/40">
                          <MessageCircle size={14} />
                       </button>
                    </div>
                    <div className="text-[12px] font-bold text-primary flex items-center gap-1 group">
                       View Profile <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <button 
                    disabled={acceptingQuoteId === q.providerId}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!acceptingQuoteId) handleAcceptQuote(q);
                    }}
                    className="w-full bg-primary text-white py-2.5 rounded-xl text-[14px] font-bold mt-1 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                  >
                    {acceptingQuoteId === q.providerId ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      "Accept Quote"
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Animated Progress Dots */}
              <div className="flex gap-2.5 my-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-[7px] h-[7px] rounded-full transition-all duration-300 ${i === activeDotIndex ? 'bg-accent scale-[1.35]' : 'bg-[#D1DCE8]'}`}
                  />
                ))}
              </div>

              {/* Trust Indicators */}
              <div className="w-full bg-[#F5F8FB] rounded-[12px] p-3 flex justify-between items-center mb-6">
                <TrustIndicator label="Verified pros" />
                <TrustIndicator label="Fast response" />
                <TrustIndicator label="Trusted service" />
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => {
                sessionStorage.removeItem("searching_providers_state");
                sessionStorage.removeItem("searching_providers_scroll");
                sessionStorage.removeItem("searching_providers_quotes");
                navigate(`/book-service/${serviceId}`, { state: { cancelled: true }, replace: true });
              }}
              className="text-[13px] font-[600] text-[#7A8BA0] hover:text-red-500 transition-colors pb-2"
            >
              Cancel Request
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-radar-sweep {
          animation: radar-sweep 10s linear infinite;
        }

        @keyframes pin-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.12); }
          100% { transform: scale(1); }
        }
        .animate-pin-pulse {
          animation: pin-pulse 2s ease-in-out infinite;
        }
        
        .animate-provider-dot {
          animation: provider-drift var(--duration) cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        @keyframes provider-drift {
          0% { 
            transform: rotate(var(--angle)) translateX(var(--dist)) scale(0);
            opacity: 0;
          }
          15% {
            transform: rotate(var(--angle)) translateX(var(--dist)) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(var(--angle)) translateX(0px) scale(0.6);
            opacity: 0;
          }
        }
        
        .-rotate-dot {
          transform: rotate(calc(-1 * var(--angle)));
        }

        @keyframes badge-up {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-badge-up {
          animation: badge-up 0.5s ease-out;
        }

        @keyframes status-fade {
          0% { opacity: 0; transform: translateY(8px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
        .animate-status-fade {
          animation: status-fade 1.8s ease-in-out forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

const TrustIndicator = ({ label }: { label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
        <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <span className="text-[11px] font-[500] text-primary">{label}</span>
  </div>
);

export default SearchingProviders;
