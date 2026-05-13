import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
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

const SearchingProviders = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const [dots, setDots] = useState<ProviderDot[]>([]);
  const [foundCount, setFoundCount] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const [isLongWait, setIsLongWait] = useState(false);
  const [error, setError] = useState("");

  const { user, nearbyProviders, currentLocation, dispatch, receivedQuotes, bookingNotes, bookingVoiceNoteUrl, bookingVoiceNote } = useApp();
  const hasTriggered = useRef(false);
  const broadcastIdRef = useRef(`bc-${user.id || 'anon'}-${Date.now()}`);

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

  // ── Broadcast Job ────────────────────────────────────────────────────────
  // Emits broadcast_job immediately (with coords if GPS already resolved)
  // AND re-emits every 5s for late-connecting providers, always using the
  // latest coordsRef value so GPS doesn't need to race the first render.
  useEffect(() => {
    dispatch({ type: "CLEAR_RECEIVED_QUOTES" });

    const buildPayload = () => ({
      broadcastId: broadcastIdRef.current,
      customerId: user.id,
      customerName: user.name,
      serviceId: serviceId || "electrician",
      address: user.address || "Current Location",
      lat: coordsRef.current?.lat ?? null,
      lng: coordsRef.current?.lng ?? null,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: bookingNotes || "Quick fix request from customer",
      voiceNoteUrl: bookingVoiceNoteUrl,
      voiceNote: bookingVoiceNote
    });

    const doEmit = () => {
      if (socket.connected) {
        const payload = buildPayload();
        console.log("[socket] emitting broadcast_job:", payload.serviceId, "lat:", payload.lat, "lng:", payload.lng);
        socket.emit("broadcast_job", payload);
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

  const handleAcceptQuote = async (quote: any) => {
    if (!user || !user.id) {
      setError("Please log in to confirm booking");
      setTimeout(() => navigate("/auth", { replace: true }), 1500);
      return;
    }
    setError("");

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
        const enrichedBooking = {
          ...res.data,
          providerDetails: {
            name: quote.providerName,
            avatar: quote.providerAvatar,
            rating: quote.rating,
            experienceYrs: quote.reviews
          }
        };
        dispatch({ type: "ADD_BOOKING", booking: enrichedBooking });
        
        // Notify the winning provider & other providers the job is taken
        socket.emit("accept_quote", { 
          broadcastId: broadcastIdRef.current, 
          acceptedProviderId: quote.providerId,
          bookingId: res.data.id,
          customerName: user.name,
          address: user.address || "Customer Location",
          serviceId: serviceId,
          price: quote.price,
          lat: currentLocation?.lat,
          lng: currentLocation?.lng,
        });

        navigate(`/tracking/${res.data.id}`);
      } else {
        setError("Failed to confirm booking.");
      }
    } catch (err) {
      console.error(err);
      setError("Error confirming quote. Check your connection.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-['DM_Sans',sans-serif] overflow-hidden select-none">

      {/* Top Bar */}
      <div className="px-5 pt-6 pb-2 flex items-center gap-4 relative z-20">
        <button
          onClick={() => navigate(-1)}
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
            {/* Background */}
            <rect width="380" height="340" fill="#E8EEF5" />

            {/* Grid Lines */}
            <g stroke="#D5DFE8" strokeWidth="0.5">
              {[...Array(13)].map((_, i) => (
                <line key={`v-${i}`} x1={i * 30 + 10} y1="0" x2={i * 30 + 10} y2="340" />
              ))}
              {[...Array(12)].map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={i * 30 + 10} x2="380" y2={i * 30 + 10} />
              ))}
            </g>

            {/* Buildings (Rounded Rects) */}
            <rect x="40" y="50" width="30" height="20" rx="4" fill="#D8E3EC" />
            <rect x="280" y="80" width="45" height="30" rx="6" fill="#CDD9E4" />
            <rect x="60" y="240" width="40" height="40" rx="8" fill="#D8E3EC" />
            <rect x="300" y="220" width="25" height="40" rx="5" fill="#CDD9E4" />
            <rect x="150" y="280" width="60" height="25" rx="6" fill="#D8E3EC" />
            <rect x="100" y="100" width="30" height="30" rx="6" fill="#CDD9E4" opacity="0.6" />

            {/* Road Paths */}
            <path d="M0,170 Q190,170 380,170" stroke="#C8D6E2" strokeWidth="4" fill="none" />
            <path d="M190,0 Q190,170 190,340" stroke="#C8D6E2" strokeWidth="4" fill="none" />
            <path d="M50,0 C80,150 300,190 330,340" stroke="#C8D6E2" strokeWidth="3" fill="none" opacity="0.5" />

            {/* Ripple Rings */}
            <circle cx="190" cy="170" r="0" fill="none" stroke="url(#blue-grad)" strokeWidth="1.5">
              <animate attributeName="r" from="0" to="200" dur="3s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.2 0 0.8 1" />
              <animate attributeName="opacity" from="0.6" to="0" dur="3s" begin="0s" repeatCount="indefinite" />
            </circle>
            <circle cx="190" cy="170" r="0" fill="none" stroke="url(#blue-grad)" strokeWidth="1">
              <animate attributeName="r" from="0" to="200" dur="3s" begin="1s" repeatCount="indefinite" calcMode="spline" keySplines="0.2 0 0.8 1" />
              <animate attributeName="opacity" from="0.4" to="0" dur="3s" begin="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="190" cy="170" r="0" fill="none" stroke="#F59E0B" strokeWidth="0.8">
              <animate attributeName="r" from="0" to="220" dur="3s" begin="2s" repeatCount="indefinite" calcMode="spline" keySplines="0.2 0 0.8 1" />
              <animate attributeName="opacity" from="0.3" to="0" dur="3s" begin="2s" repeatCount="indefinite" />
            </circle>

            {/* Gradients */}
            <defs>
              <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#152E4B" />
                <stop offset="100%" stopColor="#1C3D63" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Center Pin Glow */}
            <circle cx="190" cy="170" r="22" fill="rgba(21,46,75,0.05)" className="animate-pulse" />

            {/* Center Pin */}
            <circle cx="190" cy="170" r="18" fill="rgba(21,46,75,0.08)" />
            <g className="animate-pin-pulse" filter="url(#glow)">
              <circle cx="190" cy="170" r="12" fill="white" stroke="#152E4B" strokeWidth="1.5" />
              <path d="M190,175 L186,169 A4,4 0 1,1 194,169 Z" fill="#152E4B" transform="translate(0, -2)" />
              <circle cx="190" cy="168.5" r="1.5" fill="white" />
            </g>
          </svg>
        </div>

        {/* Found Counter Badge (Top Right) */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md border border-[#152E4B1A] py-1.5 px-3.5 rounded-[12px] shadow-sm z-10 animate-fade-in flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] font-[600] text-primary tracking-tight">{foundCount} pros found</span>
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
                <div className="flex flex-col items-center">
                  <div className="w-[34px] h-[34px] rounded-full bg-white backdrop-blur-sm border-2 border-primary flex items-center justify-center shadow-lg animate-bounce">
                    <span className="text-[10px] font-extrabold text-primary">{p.name.charAt(0)}</span>
                  </div>
                  <div className="bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md mt-1 shadow-sm">
                    {p.name}
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
            <div className="w-full flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto no-scrollbar">
              {receivedQuotes.map((q) => (
                <div 
                  key={q.providerId} 
                  onClick={() => navigate(`/provider/${q.providerId}`)}
                  className="bg-white border border-[#E1E8EF] rounded-2xl p-4 flex flex-col gap-3 text-left shadow-sm animate-badge-up cursor-pointer"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#F5F8FB] flex items-center justify-center font-bold text-primary border border-[#E1E8EF]">
                        {q.providerAvatar}
                      </div>
                      <div>
                        <h4 className="text-[15px] font-[600] text-foreground">{q.providerName}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-[#7A8BA0] mt-0.5">
                          {q.rating === 0 ? (
                            <span className="flex items-center gap-0.5 text-yellow-600 bg-yellow-100 px-1 py-0.5 rounded font-[600] text-[10px] uppercase">New</span>
                          ) : (
                            <span className="flex items-center gap-0.5 text-yellow-500 font-[600]"><span className="text-[12px]">★</span> {q.rating}</span>
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
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptQuote(q);
                    }}
                    className="w-full bg-primary text-white py-2.5 rounded-xl text-[13px] font-[600] mt-1 active:scale-95 transition-transform"
                  >
                    Accept Quote
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
              onClick={() => navigate(-1)}
              className="text-[13px] font-[600] text-[#7A8BA0] hover:text-primary transition-colors pb-2"
            >
              Cancel Request
            </button>
          </div>
        </div>
      </div>

      <style>{`
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
