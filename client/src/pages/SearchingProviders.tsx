import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  ChevronRight,
  Star,
} from "lucide-react";

import { useApp, ProviderQuote } from "@/context/AppContext";
import { socket } from "@/lib/socket";
import { createBooking } from "@/lib/api";
import { useCurrentLocation } from "@/hooks/useLocation";

/**
 * MODERN SEARCHING EXPERIENCE
 */

const SECONDARY_STATUS_MESSAGES = [
  "Scanning nearby providers...",
  "Checking live availability...",
  "Matching top-rated providers...",
  "Looking for the fastest response...",
  "Verifying trusted professionals...",
  "Searching your surrounding area...",
];

interface CachedSearchState {
  serviceId: string;
  broadcastId: string;
  statusIndex: number;
  activeDotIndex: number;
  isLongWait: boolean;
}

const getCachedSearchState = (
  serviceId: string | undefined
): CachedSearchState | null => {
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

  const [foundCount, setFoundCount] = useState(0);

  const [statusIndex, setStatusIndex] = useState(
    () => cachedState?.statusIndex ?? 0
  );

  const [activeDotIndex, setActiveDotIndex] = useState(
    () => cachedState?.activeDotIndex ?? 0
  );

  const [isLongWait, setIsLongWait] = useState(
    () => cachedState?.isLongWait ?? false
  );

  const [error, setError] = useState("");

  const [acceptingQuoteId, setAcceptingQuoteId] = useState<string | null>(
    null
  );

  // Timer state for provider search timeout
  const initSearchStartTime = () => {
  const stored = sessionStorage.getItem('search_start_time');
  if (stored) {
    return parseInt(stored, 10);
  }
  const now = Date.now();
  sessionStorage.setItem('search_start_time', String(now));
  return now;
};

const [searchStartTime, setSearchStartTime] = useState<number>(initSearchStartTime());
  const [remainingSeconds, setRemainingSeconds] = useState<number>(300);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState<boolean>(false);

  // Effect to update countdown every second
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - searchStartTime) / 1000);
      const secs = Math.max(300 - elapsed, 0);
      setRemainingSeconds(secs);
      if (secs <= 0 && !hasTimedOut) {
        setHasTimedOut(true);
        setShowTimeoutModal(true);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [searchStartTime, hasTimedOut]);

  const {
    user,
    nearbyProviders,
    currentLocation,
    dispatch,
    receivedQuotes,
    bookingNotes,
    bookingVoiceNoteUrl,
    bookingVoiceNote,
    selectedDate,
    selectedTime,
  } = useApp();

  const isRestoredRef = useRef(!!cachedState);

  const hasTriggered = useRef(!!cachedState);

  const [broadcastId] = useState(
    () => cachedState?.broadcastId || `bc-${user?.id || "anon"}-${Date.now()}`
  );

  // GPS -> SVG Position
  const getProviderPos = (lat: number, lng: number) => {
    if (!currentLocation) {
      return { x: 190, y: 170, opacity: 0 };
    }

    const zoom = 10000;

    const dx = (lng - currentLocation.lng) * zoom;

    const dy = (currentLocation.lat - lat) * zoom;

    return {
      x: 190 + dx,
      y: 170 + dy,
      opacity: 1,
    };
  };

  // LOCATION
  const coordsRef = useRef<{ lat: number; lng: number } | null>(
    currentLocation
  );

  const handleLocationUpdate = useCallback(
    (lat: number, lng: number) => {
      coordsRef.current = { lat, lng };

      dispatch({
        type: "SET_CURRENT_LOCATION",
        lat,
        lng,
      });
    },
    [dispatch]
  );

  useCurrentLocation(handleLocationUpdate);

  // SCROLL
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      sessionStorage.setItem(
        "searching_providers_scroll",
        scrollContainerRef.current.scrollTop.toString()
      );
    }
  };

  useEffect(() => {
    if (receivedQuotes.length > 0 && scrollContainerRef.current) {
      const savedScroll = sessionStorage.getItem(
        "searching_providers_scroll"
      );

      if (savedScroll) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = parseInt(savedScroll, 10);
          }
        }, 50);
      }
    }
  }, [receivedQuotes.length]);

  // ANIMATIONS
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setActiveDotIndex((prev) => (prev + 1) % 5);
    }, 650);

    const statusInterval = setInterval(() => {
      setStatusIndex(
        (prev) => (prev + 1) % SECONDARY_STATUS_MESSAGES.length
      );
    }, 2600);

    const waitTimeout = setTimeout(() => {
      setIsLongWait(true);
    }, 15000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(statusInterval);
      clearTimeout(waitTimeout);
    };
  }, []);

  // REAL PROVIDER COUNT
  useEffect(() => {
    const providerCount = Object.keys(nearbyProviders).length;

    const quotesCount = receivedQuotes.length;

    setFoundCount(Math.max(providerCount, quotesCount));
  }, [nearbyProviders, receivedQuotes]);

  // CACHE STATE
  useEffect(() => {
    if (!serviceId) return;

    const stateToCache: CachedSearchState = {
      serviceId,
      broadcastId,
      statusIndex,
      activeDotIndex,
      isLongWait,
    };

    sessionStorage.setItem(
      "searching_providers_state",
      JSON.stringify(stateToCache)
    );
  }, [
    serviceId,
    broadcastId,
    statusIndex,
    activeDotIndex,
    isLongWait,
  ]);

  // CACHE QUOTES
  useEffect(() => {
    if (receivedQuotes.length > 0) {
      sessionStorage.setItem(
        "searching_providers_quotes",
        JSON.stringify(receivedQuotes)
      );
    }
  }, [receivedQuotes]);

  // BROADCAST
  useEffect(() => {
    if (isRestoredRef.current) {
      try {
        const cachedQuotes = sessionStorage.getItem(
          "searching_providers_quotes"
        );

        if (cachedQuotes) {
          const parsed = JSON.parse(cachedQuotes);

          parsed.forEach((q: any) => {
            dispatch({
              type: "ADD_RECEIVED_QUOTE",
              quote: q,
            });
          });
        }
      } catch (e) {
        console.error("Failed to restore quotes", e);
      }
    } else {
        dispatch({ type: "CLEAR_RECEIVED_QUOTES" });
        // New quick‑fix request – clear any persisted start time so a fresh timer begins.
        sessionStorage.removeItem('search_start_time');
        // Re‑initialise the start timestamp for this new session.
        const freshNow = Date.now();
        sessionStorage.setItem('search_start_time', String(freshNow));
        setSearchStartTime(freshNow);
    }

    const buildPayload = () => ({
      broadcastId,
      customerId: user.id,
      customerName: user.name,
      serviceId: serviceId || "electrician",
      address: user.address || "Current Location",
      lat: coordsRef.current?.lat ?? null,
      lng: coordsRef.current?.lng ?? null,
      date: selectedDate || new Date().toISOString().slice(0, 10),
      time:
        selectedTime ||
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      notes: bookingNotes || "Quick fix request from customer",
      voiceNoteUrl: bookingVoiceNoteUrl,
      voiceNote: bookingVoiceNote,
    });

    const doEmit = () => {
      if (socket.connected) {
        socket.emit("broadcast_job", buildPayload());

        if (!hasTriggered.current) {
          dispatch({
            type: "ADD_NOTIFICATION",
            text: "Searching for nearby providers...",
          });

          hasTriggered.current = true;
        }
      }
    };

    if (socket.connected) {
      doEmit();
    } else {
      socket.once("connect", doEmit);
    }

    const interval = setInterval(doEmit, 5000);

    return () => {
      clearInterval(interval);
      socket.off("connect", doEmit);
    };
  }, [
    serviceId,
    user,
    dispatch,
    bookingNotes,
    bookingVoiceNoteUrl,
    bookingVoiceNote,
  ]);

  // ACCEPT QUOTE
  const handleAcceptQuote = async (quote: ProviderQuote) => {
    if (acceptingQuoteId) return;

    try {
      setError("");
      setAcceptingQuoteId(quote.providerId);

      const bookingData = {
        customer_id: String(user?.id || ""),
        provider_id: String(quote.providerId || ""),
        service_id: String(serviceId || ""),
        status: "assigned",
        scheduled_at: new Date().toISOString(),
        address:
          user?.address ||
          (currentLocation
            ? `${currentLocation?.lat},${currentLocation?.lng}`
            : "Customer Location"),
        lat: currentLocation?.lat || null,
        lng: currentLocation?.lng || null,
        price: Number(quote.price || 0),
        notes: bookingNotes || "",
        voice_note: bookingVoiceNote || false,
        voice_note_url: bookingVoiceNoteUrl || null,
        paid: false,
      };

      console.log("BOOKING PAYLOAD", bookingData);

      const res = await createBooking(bookingData);

      console.log("BOOKING RESPONSE", res);

      if (res?.success && res?.data?.id) {
        // Add booking to context and navigate to tracking page
        dispatch({ type: "ADD_BOOKING", booking: res.data });
        navigate(`/tracking/${res.data.id}`);
        return;
      }

      throw new Error(res?.message || "Booking creation failed");
    } catch (error: any) {
      console.error("ACCEPT QUOTE ERROR", error);
      setError(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to confirm booking"
      );
    } finally {
      setAcceptingQuoteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF3F8] flex flex-col relative font-['DM_Sans',sans-serif] overflow-y-auto overflow-x-hidden">



      {/* TIMEOUT MODAL */}
      {showTimeoutModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-800">No Providers Available</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find an available provider within 5 km of your location right now.
              Please try again later or schedule the service for another time.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem('search_start_time');
                  setHasTimedOut(false);
                  setShowTimeoutModal(false);
                  const now = Date.now();
                  setSearchStartTime(now);
                  setRemainingSeconds(300);
                }}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("search_start_time");
                  navigate(-1);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-4 z-20 relative">
        <button
          onClick={() => {
            localStorage.removeItem("search_start_time");
            navigate(-1);
          }}
          className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-xl border border-white shadow-[0_6px_18px_rgba(0,0,0,0.06)] flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
      </div>

      {/* MAP */}
      <div className="h-[320px] w-full flex-shrink-0 relative overflow-hidden">

        {/* GRID BACKGROUND */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "linear-gradient(#DCE5EF 1px, transparent 1px), linear-gradient(90deg, #DCE5EF 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />

        {/* MAIN ROADS */}
        <div className="absolute left-1/2 top-0 w-[10px] h-full bg-white/70 -translate-x-1/2" />

        <div className="absolute top-1/2 left-0 h-[10px] w-full bg-white/70 -translate-y-1/2" />

        {/* RADAR RINGS */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute w-[110px] h-[110px] rounded-full border border-[#152E4B]/30 animate-pulse" />

          <div className="absolute w-[180px] h-[180px] rounded-full border border-[#152E4B]/20" />

          <div className="absolute w-[250px] h-[250px] rounded-full border border-[#152E4B]/10" />
        </div>

        {/* CENTER POINT */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="relative flex items-center justify-center">

            <div className="absolute w-20 h-20 rounded-full bg-[#152E4B]/10 animate-ping" />

            <div className="absolute w-12 h-12 rounded-full bg-[#152E4B]/10" />

            <div className="w-5 h-5 rounded-full bg-[#152E4B] border-4 border-white shadow-lg" />
          </div>
        </div>

        {/* MODERN STATUS BADGE */}
        <div className="absolute top-5 right-5 z-20">
          <div className="bg-white/75 backdrop-blur-2xl border border-white/50 shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl px-4 py-3 flex items-center gap-3">

            <div className="relative">
              <div
                className={`w-3 h-3 rounded-full ${foundCount > 0
                  ? "bg-emerald-500"
                  : "bg-amber-400"
                  }`}
              />

              <div
                className={`absolute inset-0 rounded-full animate-ping ${foundCount > 0
                  ? "bg-emerald-400"
                  : "bg-amber-300"
                  }`}
              />
            </div>

            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-400">
                Live Search
              </span>

              <span className="text-[13px] font-bold text-slate-800">
                {foundCount === 0
                  ? "No providers nearby"
                  : `${foundCount} provider${foundCount > 1 ? "s" : ""
                  } found`}
              </span>
            </div>
          </div>
        </div>

        {/* PROVIDER MARKERS */}
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
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="relative cursor-pointer" onClick={() => {
                // Find the quote for this provider and navigate to details
                const quote = receivedQuotes.find(q => q.providerId === p.id);
                navigate(`/provider/${p.id}`, {
                  state: {
                    provider: {
                      id: p.id,
                      name: p.name,
                      avatar_url: p.avatar_url,
                      rating: p.rating || 0,
                      lat: p.lat,
                      lng: p.lng,
                      distance_km: p.distance_km || 0
                    },
                    quote: quote || {
                      providerId: p.id,
                      providerName: p.name,
                      providerAvatar: p.avatar_url || p.name?.charAt(0),
                      rating: p.rating || 0,
                      price: quote?.price || 500,
                      distanceKm: p.distance_km || 0,
                      etaMin: quote?.etaMin || 15
                    },
                    broadcastId
                  }
                });
              }}>

                <div className="absolute inset-0 rounded-full bg-[#152E4B]/20 animate-ping" />

                <div className="w-11 h-11 rounded-full bg-white p-[2px] shadow-xl border border-white hover:scale-110 transition-transform">

                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt={p.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#152E4B] flex items-center justify-center text-white font-bold text-sm">
                      {p.name?.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl text-[9px] px-2 py-1 rounded-full font-bold shadow">
                  {p.name?.split(" ")[0]}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTTOM SHEET */}
      <div className="bg-white/92 backdrop-blur-2xl rounded-t-[34px] shadow-[0_-10px_40px_rgba(0,0,0,0.06)] px-6 pt-4 pb-8 relative z-20">

        {/* HANDLE */}
        <div className="w-14 h-1.5 rounded-full bg-slate-200 mx-auto mb-7" />

        {error && (
          <div className="text-red-500 text-sm font-semibold text-center mb-4">
            {error}
          </div>
        )}

        {/* TITLE */}
        <div className="text-center">
          <h2 className="text-[32px] leading-[1.05] font-black tracking-[-0.04em] text-slate-900 mb-3">

            {foundCount === 0
              ? "Searching nearby providers"
              : "Providers available nearby"}
          </h2>

          {/* TIMER BELOW TITLE */}
          <div className="text-center text-sm text-amber-700 font-bold mt-2">
            Time Remaining
          </div>
          <div className="text-center text-2xl font-bold text-amber-700 mb-4">
            {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:{String(remainingSeconds % 60).padStart(2, '0')}
          </div>
          {/* STATUS TEXT */}
          <div className="h-8 flex items-center justify-center overflow-hidden relative mb-6">
            <p
              key={statusIndex + (isLongWait ? "wait" : "")}
              className="absolute text-[14px] text-slate-500 font-medium animate-status-fade"
            >
              {receivedQuotes.length > 0
                ? "Nearby providers are responding..."
                : isLongWait
                  ? "Still searching nearby areas..."
                  : SECONDARY_STATUS_MESSAGES[statusIndex]}
            </p>
          </div>
        </div>

        {/* QUOTES */}
        {receivedQuotes.length > 0 ? (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex flex-col gap-3 mb-6"
          >
            {receivedQuotes.map((q) => (
              <div
                key={q.providerId}
                className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm"
              >
                <div
                  className="flex justify-between cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    navigate(`/provider/${q.providerId}`, {
                      state: {
                        provider: {
                          id: q.providerId,
                          name: q.providerName,
                          avatar_url: q.providerAvatar,
                          rating: q.rating || 0
                        },
                        quote: q,
                        broadcastId
                      }
                    });
                  }}
                >

                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[#152E4B]">
                      {q.providerAvatar}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800">
                        {q.providerName}
                      </h3>

                      <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1 text-yellow-500 font-bold">
                          <Star
                            size={13}
                            className="fill-yellow-500"
                          />
                          {q.rating}
                        </span>

                        <span>
                          {q.distanceKm} km away
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[20px] font-black text-[#152E4B]">
                      ₹{q.price}
                    </div>

                    <div className="text-xs text-green-600 font-semibold">
                      ETA {q.etaMin} mins
                    </div>
                  </div>
                </div>

                <button
                  disabled={acceptingQuoteId === q.providerId}
                  onClick={() => handleAcceptQuote(q)}
                  className="w-full mt-4 bg-[#152E4B] text-white py-3 rounded-2xl font-bold active:scale-95 transition"
                >
                  {acceptingQuoteId === q.providerId
                    ? "Confirming..."
                    : "Accept Quote"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* LOADING DOTS */}
            <div className="flex justify-center gap-3 mb-7">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`transition-all duration-300 rounded-full ${i === activeDotIndex
                    ? "w-3 h-3 bg-amber-400 scale-125"
                    : "w-2 h-2 bg-slate-300"
                    }`}
                />
              ))}
            </div>

            {/* TRUST BADGES */}
            <div className="bg-slate-50 rounded-2xl p-4 flex justify-between mb-6">
              <TrustIndicator label="Verified" />
              <TrustIndicator label="Trusted" />
              <TrustIndicator label="Fast Response" />
            </div>
          </>
        )}

        {/* CANCEL BUTTON */}
        <button
          onClick={() => navigate(-1)}
          className="w-full h-14 rounded-2xl border border-red-100 bg-red-50 text-red-500 font-bold active:scale-95 transition"
        >
          Cancel Request
        </button>
      </div>

      {/* ANIMATIONS */}
      <style>{`
        @keyframes status-fade {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }

          10% {
            opacity: 1;
            transform: translateY(0);
          }

          90% {
            opacity: 1;
            transform: translateY(0);
          }

          100% {
            opacity: 0;
            transform: translateY(-8px);
          }
        }

        .animate-status-fade {
          animation: status-fade 2s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

const TrustIndicator = ({
  label,
}: {
  label: string;
}) => (
  <div className="flex items-center gap-2">
    <div className="w-5 h-5 rounded-full bg-[#152E4B] flex items-center justify-center">
      <svg
        width="10"
        height="8"
        viewBox="0 0 10 8"
        fill="none"
      >
        <path
          d="M1 4L3.5 6.5L9 1"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    <span className="text-[12px] font-semibold text-slate-700">
      {label}
    </span>
  </div>
);

export default SearchingProviders;